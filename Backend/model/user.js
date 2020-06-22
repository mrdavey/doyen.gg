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

async function getUser (key) {
  return await db.get(TYPES.USER, key)
}

async function setUser (key, value) {
  return await db.set(TYPES.USER, key, value)
}

async function getFollower (key) {
  return await db.get(TYPES.FOLLOWERS, key)
}

async function setFollower (key, value) {
  return await db.set(TYPES.FOLLOWERS, key, value)
}

module.exports = {
  getUser,
  setUser,
  getFollower,
  setFollower
}
