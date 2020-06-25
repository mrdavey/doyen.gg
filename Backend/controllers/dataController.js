const { setUserValue, getUserObject, setFollowersIds, getFollowerCount, getFollowersObject, hydrateFollowerIds } = require('../model/dataStore')
const { getFollowers, hydrate } = require('./twitter')

async function saveUserData (accessTokens, userObject) {
  await setUserValue('auth', {
    token: accessTokens.oauth_token,
    tokenSecret: accessTokens.oauth_token_secret
  })
  await setUserValue('user', userObject)
}

async function getUserData () {
  const userObj = await getUserObject()
  if (userObj && userObj.auth && userObj.auth.token && userObj.auth.tokenSecret && userObj.user) {
    return userObj
  }
  return null
}

async function downloadFollowerIds (userId) {
  const before = await getFollowerCount()
  const result = await getFollowers({ userId, limit: 100 })
  await setFollowersIds(result.ids, result.next, result.previous)
  const after = await getFollowerCount()
  return { before, after }
}

async function getDownloadedFollowers () {
  const followersObj = await getFollowersObject()
  return followersObj.followers
}

// ids = {id: { }}
async function hydrateFollowers (ids) {
  const validIds = []
  Object.keys(ids).map(key => {
    if (ids[key].lastUpdate) {
      const nowSeconds = Date.now() / 1000
      if (nowSeconds - (ids[key].lastUpdate / 1000) > 2592000) { // 30 days
        console.log('more than 30 days')
        validIds.push(key)
      }
    } else {
      validIds.push(key)
    }
  })

  if (validIds.length > 0) {
    const results = await hydrate({ userIds: validIds })
    await hydrateFollowerIds(results)
    return results.length
  } else {
    return 0
  }
}

module.exports = {
  saveUserData,
  getUserData,
  downloadFollowerIds,
  getDownloadedFollowers,
  hydrateFollowers
}
