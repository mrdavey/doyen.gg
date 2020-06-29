/**
 * Twitter API rate limits for OAuth v.1.0
 * Fetching Follower IDs:
 *  - 15 request per 15 min === 1 req per min, max 5000 follower IDs per req
 * Hydrating Follower IDs:
 *  - 900 request per 15 min === 60 req per min, max 100 follower IDs per req
 * Sending DMs:
 *  - 1000 DMs per 24 hour period === 40 DMs per hour || 250 per 4 hour || 500 per 2 hour
 */

const { downloadFollowerIds, getFollowersToHydrate, getUserData, hydrateFollowers, getDMsRemaining, recordDMCampaign } = require('./dataController')
const { sendDirectMessage } = require('../controllers/twitter')
const { convertTimestampToSeconds, getTimeLeftFromNow } = require('../helpers')
const { info, log, error } = require('./log')

async function fetchFollowersAndHydrate () {
  const userObj = await getUserData()
  if (!userObj) error('User not logged in yet')
  const followersCount = Number(userObj.user.followers)

  // If followersCount < 75k, we can fetch and hydrate in one go safely
  const estimatedTime = followersCount < 75000 ? '1' : (followersCount / 5000).toFixed(2)

  if (followersCount < 75000) {
    info('Using burst mode for fetching and hydrating followers...')
    await _loopLocal(_fetchAndHydrateLoop, userObj, 1.5) // 1.5s buffer for writing to disk
    info(`Burst mode hydration completed for ${followersCount} followers!`)
  } else {
    info('Fetching and hydrating followers every minute (~83 followers/sec)')
    info(`For your amount of followers, this will take approximately ${estimatedTime} minutes if you leave this executing in the background...`)
    await _loopLocal(_fetchAndHydrateLoop, userObj, 60)
    info(`Hydration process completed for ${followersCount} followers!`)
  }
}

/**
 * Sends DMs to followers in a burst, using up the 24 hr limit where possible
 * @param { String [] } followerIds An array of followerIds. Max 1000 IDs.
 * @param { String } message The message to send. Max 10,000 characters.
 * @param { Boolean } coldRun When true, the DM is not actually sent to Twitters API.
 * @returns { { remaining: Number, periodEnds: Number } } The remaining DMs available to send and the millisecond timestamp of when the current period ends
 */
async function sendDMs (followerIds, message, coldRun = true) {
  if (!(followerIds.length > 0)) return error('No follower IDs given.')
  const userObj = await getUserData()
  if (!userObj) error('User not logged in yet')

  let dmLimit = 1000

  const { remaining, periodEnds } = await getDMsRemaining()
  const timeLeftHours = getTimeLeftFromNow(periodEnds)

  if (remaining > 0) {
    if (remaining < dmLimit) {
      info(`We've already sent some DMs this period, so you have ${remaining} DMs available to send for the next ${timeLeftHours} hours.`)
    }
    dmLimit = Math.min(remaining, 1000)

    if (followerIds.length > dmLimit) info(`Too many follower IDs given, only the first ${dmLimit} will be used.`)
    const prunedIds = followerIds.slice(0, dmLimit)

    if (message.length > 10000) info('Message is too long, pruning to first 10,000 characters.')
    const prunedMsg = message.substring(0, 10000)

    info(coldRun ? `🧊 Doing a cold run of sending DMs to ${prunedIds.length} followers.` : `🔥 Sending real DMs to ${prunedIds.length} followers`)

    const dmed = []
    for (let i = 0; i < prunedIds.length; i++) {
      try {
        const id = prunedIds[i]
        await sendDirectMessage(id, prunedMsg, userObj.auth.token, userObj.auth.tokenSecret, coldRun)
        dmed.push(id)
      } catch (e) {
        error(`DM error: ${e.message}, finalising current operation`, false)
        break
      }
    }

    if (!coldRun) await recordDMCampaign(dmed, prunedMsg)

    info('DM campaign completed')
    return { remaining: dmLimit - dmed.length, periodEnds }
  } else {
    info(`We've hit our DM limit for this period. Wait ${timeLeftHours} hours before trying again.`)
    return { remaining: 0, periodEnds }
  }
}

//
// INTERNAL
//

/**
 * Fetches and hydrates, once
 * @param { {} } userObj The user object from dataStore
 * @returns { Boolean } Whether there is more to fetch and hydrate
 */
async function _fetchAndHydrateLoop (userObj) {
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
async function _loopLocal (functionToCall, param, intervalSeconds) {
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
  fetchFollowersAndHydrate,
  sendDMs,
}
