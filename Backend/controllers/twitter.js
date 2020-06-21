const { makeRequest } = require('./fetch')
const { twitterSignHmac } = require('./auth')
const { log, error } = require('./log')

const key = process.env.TWITTER_KEY
const secret = process.env.TWITTER_SECRET
let bearerToken

//
// Internal
//

/**
 * Get the bearer token used for Twitter API calls for 'App' rate limiting
 */
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

/**
 * Makes an authenticated Twitter call
 * @param { String } url The full twitter endpoint URL.
 * @param { String } body The body to be included in the request.
 * @param { String } method The HTTP method, e.g. POST.
 * @param { String } oAuthHeader Optional. Used when accessing a user endpoint, e.g. direct messaging.
 * @param { Boolean } isTextResponse Optional. Whether the API response is expected as text or JSON. Default JSON.
 */
async function makeTwitterCall ({ url, body, method, oAuthHeader, isTextResponse }) {
  if (!oAuthHeader && !bearerToken) {
    await adminGetBearerToken()
  }

  const headers = {
    Authorization: oAuthHeader || `Bearer ${bearerToken}`
  }

  return await makeRequest({ url, body, headers, method, isTextResponse })
}

//
// Exports
//

// Authentication

/**
 * OAuth v.1.0: Step 1 of 'Log in with Twitter'.
 * Docs: https://developer.twitter.com/en/docs/basics/authentication/api-reference/request_token
 * @note Receives the OAuth request token and secret for authenticating the user.
 */
async function getRequestToken () {
  const callback = encodeURI('http://localhost:3001/callback')
  const endpoint = 'https://api.twitter.com/oauth/request_token'
  const body = { oauth_callback: callback }

  const { oAuthHeader } = twitterSignHmac({
    method: 'POST',
    url: endpoint,
    body
  })

  const result = await makeTwitterCall({
    method: 'POST',
    url: endpoint,
    oAuthHeader,
    isTextResponse: true
  })

  if (result.oauth_callback_confirmed !== 'true') {
    error('OAuth callback not confirmed!')
  } else {
    return {
      token: result.oauth_token,
      secret: result.oauth_token_secret
    }
  }
}

/**
 * OAuth v.1.0: Step 2
 * Docs: https://developer.twitter.com/en/docs/basics/authentication/api-reference/authenticate
 * @note Redirects the user to the Twitter login page to approve permissions.
 * @note Front end should issue an HTTP 302 redirect as the response to the original “sign in” request.
 * @param { String } oAuthToken The token returned from `requestToken()` call
 */
function redirect (oAuthToken) {
  return `https://api.twitter.com/oauth/authenticate?oauth_token=${oAuthToken}`
}

/**
 * OAuth v.1.0: Step 2.5
 * @param { { oauth_token: String, oauth_verifier: String } } params The request query params received by Twitter's server
 */
async function redirectCallback (params) {
  const oAuthToken = params.oauth_token
  const oAuthVerifier = params.oauth_verifier

  // TODO: - compare oAuthToken with original

  // Exchange OAuth request token with OAuth access token and secret
  return await getAccessToken(oAuthToken, oAuthVerifier)
}

/**
 * OAuth v.1.0: Step 3
 * Docs: https://developer.twitter.com/en/docs/basics/authentication/api-reference/access_token
 * @param { String } oAuthToken The oAuth request token.
 * @param { String } oAuthVerifier The oAuth request auth verifier token.
 * @returns { { oauth_token: String, oauth_token_secret: String, user_id: String, screen_name: String }}
 */
async function getAccessToken (oAuthToken, oAuthVerifier) {
  const result = await makeTwitterCall({
    method: 'POST',
    url: `https://api.twitter.com/oauth/access_token?oauth_token=${oAuthToken}&oauth_verifier=${oAuthVerifier}`,
    isTextResponse: true
  })

  return result
}

async function verifyCredentials (token, secret) {
  const endpoint = 'https://api.twitter.com/1.1/account/verify_credentials.json'

  const { oAuthHeader } = twitterSignHmac({
    method: 'GET',
    url: endpoint,
    oAuthToken: token,
    oAuthTokenSecret: secret
  })

  const result = await makeTwitterCall({
    method: 'GET',
    url: endpoint,
    oAuthHeader
  })

  if (result) {
    return processUserObject(result)
  } else {
    error('Failure when verifying twitter credentials')
  }
}

// Scheduled actions

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

  return result.map((user) => processUserObject(user))
}

/**
 *
 * @note Endpoint docs: https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event
 * @param {*} param0
 */
async function sendDirectMessage (id, message) {
  const event = {
    type: 'message_create',
    message_create: {
      target: { recipient_id: id },
      message_data: { text: message }
    }
  }

  const result = await makeTwitterCall({
    url: 'https://api.twitter.com/1.1/direct_messages/events/new.json',
    body: event
  })
}

//
// Helpers
//

/**
 * Process a Twitter user object into the info we want
 * Docs: https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/user-object
 */
function processUserObject (user) {
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
    profileImage: user.profile_image_url_https.replace('normal', '400x400'),
    defaultProfile: user.default_profile,
    defaultImage: user.default_profile_image
  }
}

module.exports = {
  getFollowers,
  hydrate,
  getRequestToken,
  redirect,
  redirectCallback,
  getAccessToken,
  verifyCredentials
}
