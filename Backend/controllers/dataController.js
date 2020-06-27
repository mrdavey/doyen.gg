const {
  setUserAuthValues,
  setUserObjValues,
  getUserEntity,
  setDownloadedFollowersEntity,
  getFollowerCount,
  getDownloadedFollowersCursor,
  getUnhydratedFollowers,
  hydrateFollowerIds,
} = require('../model/dataStore')
const { getFollowers, hydrate } = require('./twitter')

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
async function downloadFollowerIds (userObj, limit) {
  const before = await getFollowerCount()
  let cappedLimit = limit

  if (process.env.LOCAL_INSTANCE) {
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

module.exports = {
  saveUserData,
  getUserData,
  downloadFollowerIds,
  getFollowersToHydrate,
  hydrateFollowers
}
