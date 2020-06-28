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
  setLatestDMCampaign
}
