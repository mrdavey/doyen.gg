// getFollowers
// 15 req per 15min == 1 req per min (5000 followers max per req)
// next page in next cursor, otherwise next == 0

// hydrate
// 900 req per 15min == 60 per min (100 per req)

//send DM
// 1000 per 24 hr == 40 per hour || 250 in 4 hr || 500 in 2 hr
const { downloadFollowerIds, getFollowersToHydrate, getUserData, hydrateFollowers } = require('./dataController')
const { info, log, error } = require('./log')

async function fetchFollowersAndHydrate () {
  const userObj = await getUserData()
  if (!userObj) error('User not logged in yet')
  const followersCount = Number(userObj.user.followers)

  // If followersCount < 75k, we can fetch and hydrate in one go safely
  const estimatedTime = followersCount < 75000 ? '1' : (followersCount / 5000).toFixed(2)

  if (followersCount < 75000) {
    info('Using burst mode for fetching and hydrating followers...')
    await loopLocal(fetchAndHydrateLoop, userObj, 1.5) // 1.5s buffer for writing to disk
    info(`Burst mode hydration completed for ${followersCount} followers!`)
  } else {
    info('Fetching and hydrating followers every minute')
    info(`For your amount of followers, this will take approximately ${estimatedTime} minutes if you leave this executing in the background...`)
    await loopLocal(fetchAndHydrateLoop, userObj, 60)
    info(`Hydration process completed for ${followersCount} followers!`)
  }
}

/**
 * Fetches and hydrates, once
 * @param { {} } userObj The user object from dataStore
 * @returns { Boolean } Whether there is more to fetch and hydrate
 */
async function fetchAndHydrateLoop (userObj) {
  const { before, after, nextCursor } = await downloadFollowerIds(userObj)
  const downloadedIds = after - before
  const idsMsg = `Downloaded ${downloadedIds} follower IDs`
  await sleep(1)
  const unhydrated = await getFollowersToHydrate()
  let hydrated = 0

  if (unhydrated && unhydrated.length > 0) {
    // break into groups of 100 as we can receive up to 5000 followers in previous request
    const chunksNum = 100
    if (unhydrated.length > chunksNum) {
      log(`Unhydrated length: ${unhydrated.length} too large, breaking into chunks of ${chunksNum}`)
      const chunked = []
      let index = 0

      while (index < unhydrated.length) {
        chunked.push(unhydrated.slice(index, chunksNum + index))
        index += chunksNum
      }

      for (let i = 0; i < chunked.length; i++) {
        const hydratedIdsCount = await hydrateFollowers(chunked[i], userObj)
        hydrated += hydratedIdsCount
        log(`Hydration progress: ${hydrated}/${unhydrated.length}${nextCursor ? ' (there is more to hydrate after this)' : ''}`)
      }
    } else {
      hydrated = await hydrateFollowers(unhydrated, userObj)
    }
    log(`${idsMsg}, hydrated ${hydrated}.`)
    await sleep(1)
  } else {
    log(`${idsMsg}, none needed hydration.`)
  }

  return Number(nextCursor) !== 0
}

/**
 * Looping operation used when running operations locally
 * @param { () => {} } functionToCall The function to execute
 * @param { * } param The paramater that the function requires
 * @param { Number } intervalSeconds The number of seconds to wait between operations
 */
async function loopLocal (functionToCall, param, intervalSeconds) {
  let shouldContinue = true
  do {
    shouldContinue = await functionToCall(param)
    if (shouldContinue) {
      log(`Waiting ${intervalSeconds} seconds before next operation to stay within rate limits.`)
      await sleep(intervalSeconds)
    }
  } while (shouldContinue)
}

async function sleep (seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

module.exports = {
  fetchFollowersAndHydrate
}
