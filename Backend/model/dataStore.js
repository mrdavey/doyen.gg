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
  return { remaining: dmLimitPerDay, periodEnds: convertTimestampToSeconds(Date.now()) }
}

async function setLatestDMCampaign (campaign, ids) {
  await db.setLastDMCampaign(campaign)
  await db.setFollwersLastCampaign(campaign, ids)
}

/**
 * Get the top followers by their followers:following ratio
 * @param { Number } ratio The followers:following ratio. Higher means more followers.
 * @param { Boolean } onlyVerified Only include verified accounts
 * @returns An array of userObjects, sorted by followers:following ratio, highest -> lowest
 */
async function getTopFollowersByRatio (ratio, onlyVerified = null) {
  const sortOperation = (f) => {
    return f.followers / f.following
  }
  return (await db.performOperation((f) => ratioOperation(f, ratio), sortOperation, onlyVerified)).reverse()
}

/**
 * Get what we consider the 'most active' followers. This algo prefers older accounts that are also listed by others.
 * @param { Boolean } onlyVerified Only include verified accounts
 * @returns An array of userObjects, sorted by 'most active' followers, highest -> lowest
 */
async function getMostActiveFollowers (onlyVerified = null) {
  return (await db.performOperation(f => { return f }, mostActiveSort, onlyVerified)).reverse()
}

/**
 * Get the top followers by ratio, sorting by 'most active'.
 * @param { Number } ratio The followers:following ratio. Higher means more followers.
 * @param { Boolean } onlyVerified Only include verified accounts
 * @returns An array of userObjects, sorted by 'most active', highest -> lowest
 */
async function getTopRatioAndActiveFollowers (ratio, onlyVerified = null) {
  return (await db.performOperation(f => ratioOperation(f, ratio), mostActiveSort, onlyVerified)).reverse()
}

//
// FILTERS
//

/**
 * The function used for filtering users by follower:following ratio
 * @param { {} } f The follower user object
 */
const ratioOperation = (f, ratio) => {
  return f.followers / f.following > ratio
}

/**
 * The function used for sorting by 'most active'
 * This algo prefers older accounts that are also listed by others.
 * @param { {} } f The follower user object
 */
const mostActiveSort = (f) => {
  const weights = { listed: 2, favourites: 1, statuses: 2, created: 4 }
  const createdScore = weights.created * ((Date.now() / 1000 - convertTimestampToSeconds(Date.parse(f.created))) / 86400 / 30)
  return f.listed * weights.listed * (f.favourites * weights.favourites + f.statuses * weights.statuses + createdScore)
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
