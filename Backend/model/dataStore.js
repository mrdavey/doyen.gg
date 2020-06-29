const { convertTimestampToSeconds } = require('../helpers')
const { log } = require('../controllers/log')
const LowDB = require('./coordinators/lowdb')

let db

if (process.env.LOCAL_INSTANCE) {
  db = new LowDB()
} else {
  log('Not running a local instance!')
}

async function setUserAuthValues (dictValues) {
  return await db.setUserAuthValues(dictValues)
}
async function setUserObjValues (dictValues) {
  return await db.setUserObjValues(dictValues)
}

async function getUserEntity () {
  return await db.getUserEntity()
}

async function getDownloadedFollowersCursor () {
  return await db.getDownloadedFollowersCursor()
}

async function getUnhydratedFollowers () {
  return await db.getUnhydratedFollowers()
}

async function getOutdatedFollowers (staleDays = 30) {
  return await db.getOutdatedFollowers(staleDays)
}

// ids = array of strings
async function setDownloadedFollowersEntity (ids, nextCursor, prevCursor) {
  return await db.setDownloadedFollowersEntity(ids, nextCursor, prevCursor)
}

async function hydrateFollowerIds (hydratedArray) {
  return await db.hydrateFollowerIds(hydratedArray)
}

async function getFollowerCount () {
  return await db.getFollowerCount()
}

/**
 * Gets number of DMs that are left to send, staying within rate limits
 * @returns { { remaining: Number, periodEnds: Number }} A dictionary of remaining DMs to send and the seconds timestamp the period resets
 */
async function getDMsLeftToSend () {
  const dmLimitPerDay = 1000
  const lastDMPeriod = await db.getLastDMPeriod()
  if (lastDMPeriod) {
    const now = convertTimestampToSeconds(Date.now())
    const end = convertTimestampToSeconds(lastDMPeriod.end)
    if (end > now) {
      return { remaining: dmLimitPerDay - lastDMPeriod.dmCount, periodEnds: end }
    }
  }
  return { remaining: dmLimitPerDay, periodEnds: convertTimestampToSeconds(Date.now()) + 86400 }
}

async function setLatestDMCampaign (campaign, ids) {
  await db.setLastDMCampaign(campaign)
  await db.setFollwersLastCampaign(campaign, ids)
}

/**
 * Get the top followers by their followers:following ratio
 * @param { Number } ratio The followers:following ratio. Higher means more followers.
 * @param { Number } minTimestamp The minimum timestamp for followers most recent DM campaign
 * @param { Boolean } onlyVerified Only include verified accounts
 * @returns An array of userObjects, sorted by followers:following ratio, highest -> lowest
 */
async function getTopFollowersByRatio (ratio, minTimestamp, onlyVerified = null) {
  const sortOperation = (f) => {
    return f.followers / f.following
  }
  return (await db.performOperation((f) => ratioOperation(f, ratio, minTimestamp), sortOperation, onlyVerified)).reverse()
}

/**
 * Get what we consider the 'most active' followers. This algo prefers older accounts that are also listed by others.
 * @param { Number } minTimestamp The minimum timestamp for followers most recent DM campaign
 * @param { Boolean } onlyVerified Only include verified accounts
 * @returns An array of userObjects, sorted by 'most active' followers, highest -> lowest
 */
async function getMostActiveFollowers (minTimestamp, onlyVerified = null) {
  return (await db.performOperation(f => minTimestampOperation(f, minTimestamp), mostActiveSort, onlyVerified)).reverse()
}

/**
 * Get the top followers by ratio, sorting by 'most active'.
 * @param { Number } ratio The followers:following ratio. Higher means more followers.
 * @param { Number } minTimestamp The minimum timestamp for followers most recent DM campaign
 * @param { Boolean } onlyVerified Only include verified accounts
 * @returns An array of userObjects, sorted by 'most active', highest -> lowest
 */
async function getTopRatioAndActiveFollowers (ratio, minTimestamp, onlyVerified = null) {
  return (await db.performOperation(f => ratioOperation(f, ratio, minTimestamp), mostActiveSort, onlyVerified)).reverse()
}

//
// FILTERS
//

/**
 * The function used for filtering users by follower:following ratio
 * @param { {} } f The follower user object
 * @param { Number } ratio The followers:following ratio. Higher means more followers.
 * @param { Number } minTimestamp The minimum timestamp for followers most recent DM campaign
 */
const ratioOperation = (f, ratio, minTimestamp) => {
  const aboveRatio = f.followers / f.following > ratio
  if (minTimestamp) {
    return aboveRatio && (!f.lastCampaignId || minTimestamp > f.lastCampaignId)
  }
  return aboveRatio
}

/**
 * The function used for sorting by 'most active'
 * This algo prefers older accounts (that have recently tweeted) that are also listed by others.
 * @param { {} } f The follower user object
 */
const mostActiveSort = (f) => {
  const weights = { listed: 2, favourites: 0.5, statuses: 0.5, created: 1, recentTweet: 10 }
  const createdScore = weights.created * (convertTimestampToSeconds(Date.now()) - (convertTimestampToSeconds(f.created)) / 86400 / 30)

  // Folowers who have tweeted in last 90 days get high score, followers who have not tweeted in 90 days get penalised
  const recentTweetScore = f.lastTweet
    ? (weights.recentTweet * (convertTimestampToSeconds(f.lastTweet) - (convertTimestampToSeconds(Date.now()) - 7776000)))
    : -1
  const listedScore = f.listed * weights.listed
  const favStatCreateScore = f.favourites * weights.favourites + f.statuses * weights.statuses + createdScore
  return listedScore * (favStatCreateScore + recentTweetScore)
}

/**
 * The function used for filtering by last DM campaign minTimestamp
 * @param { {} } f The follower user object
 * @param { Number } minTimestamp The minimum timestamp for followers most recent DM campaign
 */
const minTimestampOperation = (f, minTimestamp) => {
  if (minTimestamp) {
    return !f.lastCampaignId || minTimestamp >= f.lastCampaignId
  }
  return f
}


module.exports = {
  setUserAuthValues,
  setUserObjValues,
  getUserEntity,
  getDownloadedFollowersCursor,
  getUnhydratedFollowers,
  getOutdatedFollowers,
  setDownloadedFollowersEntity,
  hydrateFollowerIds,
  getFollowerCount,
  getDMsLeftToSend,
  setLatestDMCampaign,
  getTopFollowersByRatio,
  getMostActiveFollowers,
  getTopRatioAndActiveFollowers
}
