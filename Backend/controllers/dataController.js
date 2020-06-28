const {
  setUserAuthValues,
  setUserObjValues,
  getUserEntity,
  setDownloadedFollowersEntity,
  getFollowerCount,
  getDownloadedFollowersCursor,
  getUnhydratedFollowers,
  hydrateFollowerIds,
  getDMsLeftToSend,
  setLatestDMCampaign,
  getTopFollowersByRatio,
  getMostActiveFollowers,
  getTopRatioAndActiveFollowers
} = require('../model/dataStore')
const { FILTERS } = require('../model/enums')
const { getFollowers, hydrate } = require('./twitter')
const { error } = require('./log')

/**
 * 
 * @param { { oauth_token: String, oauth_token_secret: String } } accessTokens A dictionary with accessToken OAuth details of the logged in user
 * @param { { } } userObject The userObj with user and auth details
 */
async function saveUserData (accessTokens, userObject) {
  await setUserAuthValues({
    token: accessTokens.oauth_token,
    tokenSecret: accessTokens.oauth_token_secret
  })
  await setUserObjValues(userObject)
}

/**
 * Gets the userEntity object from the dataStore
 * @returns { {} } The userEntity object with user and auth details
 */
async function getUserData () {
  const userEntity = await getUserEntity()
  if (userEntity && userEntity.auth && userEntity.auth.token && userEntity.auth.tokenSecret && userEntity.user) {
    return userEntity
  }
  return null
}

/**
 * Downloads the follower IDs of the userObj
 * @param { {} } userObj A userObj that includes user and auth details
 * @param { Number } limit The number of followers to download. Twitter hard limit is 5000.
 * @returns { { before: Number, after: Number, nextCursor: String } } A dictionary representing the 'before' and 'after' follower count in the datastore + the next cursor used by Twitter API
 */
async function downloadFollowerIds (userObj) {
  const before = await getFollowerCount()
  let cappedLimit = 5000

  if (process.env.LOCAL_INSTANCE && Number(before)) {
    // We apply a local instance limit as followers JSON file may grow too large
    cappedLimit = Math.min(Number(process.env.LOCAL_FOLLOWER_LIMIT) - Number(before), 5000)
  }

  const cursor = await getDownloadedFollowersCursor()
  const result = await getFollowers({ userId: userObj.user.id, limit: cappedLimit, cursor, token: userObj.auth.token, tokenSecret: userObj.auth.tokenSecret })
  await setDownloadedFollowersEntity(result.ids, result.next, result.previous)
  const after = await getFollowerCount()

  if (process.env.LOCAL_INSTANCE && cappedLimit < 5000) {
    return { before, after, nextCursor: 0 }
  }
  return { before, after, nextCursor: result.next }
}

/**
 * Gets the follower IDs that need to be (re)hydrated from the dataStore
 * @returns Array of follower IDs
 */
async function getFollowersToHydrate () {
  // TODO: - can also be outdated followers in the future
  return await getUnhydratedFollowers()
}

/**
 * Hydrates an array of follower IDs into 'user' objects
 * @param { String[] } ids Array of follower IDs
 * @param { {} } userObj Dictionary object of user auth `token` and `tokenSecret`
 * @returns The number of IDs hydrated
 */
async function hydrateFollowers (ids, userObj) {
  const results = await hydrate({ userIds: ids, token: userObj.auth.token, tokenSecret: userObj.auth.tokenSecret })
  await hydrateFollowerIds(results)
  return results.length
}

/**
 * Gets number of DMs that are left to send, staying within rate limits
 * @returns { { remaining: Number, periodEnds: Number }} A dictionary of remaining DMs to send and the seconds timestamp the period resets.
 */
async function getDMsRemaining () {
  return getDMsLeftToSend()
}

/**
 * Records the latest DM campaign that was sent
 * @param { String[] } ids An array of IDs that successfully received DMs
 * @param { String } message The message that was sent as part of the campaign
 */
async function recordDMCampaign (ids, message) {
  const campaign = {
    start: Date.now(),
    message,
    ids
  }
  await setLatestDMCampaign(campaign, ids)
}

async function filterFollowers (filter, onlyVerified, ratio) {
  switch (filter) {
    case FILTERS.FOLLOWERS_RATIO:
      if (!ratio) error('No ratio included')
      return await getTopFollowersByRatio(ratio, onlyVerified)
    case FILTERS.MOST_ACTIVE:
      return await getMostActiveFollowers(onlyVerified)
    case FILTERS.MOST_ACTIVE_BY_F_RATIO:
      if (!ratio) error('No ratio included')
      return await getTopRatioAndActiveFollowers(ratio, onlyVerified)
    default:
      error('Invalid filter used')
  }
}

module.exports = {
  saveUserData,
  getUserData,
  downloadFollowerIds,
  getFollowersToHydrate,
  hydrateFollowers,
  getDMsRemaining,
  recordDMCampaign,
  filterFollowers
}
