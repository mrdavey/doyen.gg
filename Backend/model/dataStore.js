const { log } = require('../controllers/log')
const LowDB = require('./coordinators/lowdb')

const TYPES = {
  USER: 'user',
  FOLLOWERS: 'followers'
}

let db

if (process.env.LOCAL_INSTANCE) {
  db = new LowDB()
} else {
  log('Not running a local instance!')
}

async function getUserValue (key) {
  return await db.get(TYPES.USER, key)
}

async function setUserValue (key, value) {
  return await db.set(TYPES.USER, key, value)
}

async function getUserObject () {
  return await db.getAll(TYPES.USER)
}

async function getFollower (key) {
  return await db.get(TYPES.FOLLOWERS, key)
}

async function getFollowersObject () {
  return await db.getAll(TYPES.FOLLOWERS)
}

async function setFollower (key, value) {
  return await db.set(TYPES.FOLLOWERS, key, value)
}

// ids = array of strings
async function setFollowersIds (ids, nextCursor, prevCursor) {
  const dict = {}
  ids.map(id => {
    dict[id] = {}
    return null
  })
  await db.add(TYPES.FOLLOWERS, 'followers', dict)
  await db.set(TYPES.FOLLOWERS, 'cursor', { next: nextCursor, prev: prevCursor })
}

async function hydrateFollowerIds (hydratedArray) {
  const dict = {}
  hydratedArray.map(hydrated => {
    dict[hydrated.id] = hydrated
    delete dict[hydrated.id].id
  })
  await db.add(TYPES.FOLLOWERS, 'followers', dict)
}

async function getFollowerCount () {
  return await db.getCount(TYPES.FOLLOWERS, 'followers')
}

module.exports = {
  getUserValue,
  setUserValue,
  getUserObject,
  getFollower,
  getFollowersObject,
  setFollower,
  setFollowersIds,
  hydrateFollowerIds,
  getFollowerCount
}
