const { makeRequest } = require('./fetch')
const { log, error } = require('./log')

const key = process.env.TWITTER_KEY
const secret = process.env.TWITTER_SECRET
let bearerToken

//
// Internal
//

async function adminGetBearerToken () {
  log('Getting latest Twitter Bearer token')
  const headers = {
    Authorization: `Basic ${Buffer.from(key + ':' + secret).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
  }

  const result = await makeRequest({
    url: 'https://api.twitter.com/oauth2/token',
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: headers
  })

  // Token is only scoped to this file
  bearerToken = result.access_token
  log(`Bearer token received: ${bearerToken.slice(0, 3)}...${bearerToken.slice(bearerToken.length - 8, bearerToken.length - 1)}`)
}

async function makeTwitterCall ({ url, body, method }) {
  if (!bearerToken) {
    await adminGetBearerToken()
  }

  const headers = {
    Authorization: `Bearer ${bearerToken}`,
    'Content-Type': 'application/json'
  }

  return await makeRequest({ url, body, headers, method })
}

//
// Exports
//

/**
 * Get follower IDs of a user
 * @note Endpoint docs: https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-followers-ids
 * @param { String } userId Optional. The user's ID (usually a large number). If undefined, `screenName` is required.
 * @param { String } screenName Optional. The user's ID (usually a large number). If undefined, `userId` is required.
 * @param { String } cursor Optional. The cursor used for paging through followers.
 * @param { Number } limit Optional. The limit of IDs to fetch. Default and max is 5000.
 * @returns { { ids: String[], next: String, previous: String, error: String } } An array of twitter string IDs, the cursor for next page, the cursor for current page, error if relevant
 */
async function getFollowers ({ userId, screenName, cursor, limit }) {
  let params = 'stringify_ids=true'

  if (userId) {
    params += `&user_id=${userId}`
  } else {
    if (!screenName) error('No twitter userId or screenName included in getFollowers()!')
    params += `&screen_name=${screenName}`
  }

  if (cursor) params += `&cursor=${cursor}`
  if (limit) params += `&count=${limit}`

  const result = await makeTwitterCall({
    url: `https://api.twitter.com/1.1/followers/ids.json?${params}`
  }).catch((e) => {
    return { ids: null, next: null, previous: null, error: e.message }
  })

  return {
    ids: result.ids,
    next: result.next_cursor_str,
    previous: result.previous_cursor_str
  }
}

/**
 * Hydrates an array of IDs or Screen Names with twitter user objects.
 * @note Endpoint docs: https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-users-lookup
 * @note User object docs: https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/user-object
 * @param { String[] } userIds An optional array of userIds. If undefined, `screenNames` is required.
 * @param { String[] } screenNames An optional array of screenNames. If undefined, `userIds` is required.
 * @returns { [{ id, name, location, url, description, verified, followers, following, listed, favourites, statuses, created, profileImage
defaultProfile
defaultImage }] } An array of twitter user objects
 */
async function hydrate ({ userIds, screenNames }) {
  const maxAllowed = 100
  let params = '' // `include_entities=true&`

  if (userIds) {
    params += `user_id=${userIds.slice(0, maxAllowed).join(',')}`
  } else {
    if (!screenNames) error('No twitter userIds or screenNames included in hydrate')
    params += `screen_name=${screenNames.slice(0, maxAllowed).join(',')}`
  }

  const result = await makeTwitterCall({
    url: `https://api.twitter.com/1.1/users/lookup.json?${params}`
  })

  return result.map(user => {
    return {
      id: user.id_str,
      screenName: user.screen_name,
      name: user.name,
      location: user.location,
      url: user.url,
      description: user.description,
      verified: user.verified,
      followers: user.followers_count,
      following: user.friends_count,
      listed: user.listed_count,
      favourites: user.favourites_count,
      statuses: user.statuses_count,
      created: user.created_at,
      profileImage: user.profile_image_url_https,
      defaultProfile: user.default_profile,
      defaultImage: user.default_profile_image
    }
  })
}

module.exports = {
  getFollowers,
  hydrate
}
