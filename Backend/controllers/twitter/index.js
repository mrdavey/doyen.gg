const { makeTwitterCall, getRequestToken, getRedirectUrl, getAccessToken } = require('./network')
const { twitterSignHmac } = require('./authSign')
const { log, error } = require('../log')

/**
 * Gets the request token and returns the redirect URL for OAuth v.1.0 authentication.
 * @note Part of the OAuth v.1.0 workflow.
 * @returns { String } The URL of the authentication page.
 */
async function getRequestTokenAndGetRedirectUrl () {
  const result = await getRequestToken()
  log(`Request token: ${result.token}`)
  return getRedirectUrl(result.token)
}

/**
 * Called by Twitter API when user authorizes Doyen.gg
 * @note Part of the OAuth v.1.0 workflow.
 * @param { { oauth_token: String, oauth_verifier: String } } params The request query params received by Twitter's server
 * @returns { {} } Access token, secret, and basic user info of the authenticated user.
 */
async function redirectCallback (params) {
  const oAuthToken = params.oauth_token
  const oAuthVerifier = params.oauth_verifier

  // TODO: - compare oAuthToken with original token
  log(`OAuthToken: ${oAuthToken}`)

  // Exchange OAuth request token with OAuth access token and secret
  return await getAccessToken(oAuthToken, oAuthVerifier)
}

/**
 * Verifies the credentials (token + secret) of the authenticated user.
 * @param { String } token The OAuth access token.
 * @param { String } secret The OAuth access token secret.
 * @returns { {} } The parsed UserObject of the authenticated user.
 */
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
 * @returns { [{ id, name, location, url, description, verified, followers, following, listed, favourites, statuses, created, profileImage, defaultProfile, defaultImage, lastUpdate }] } An array of twitter user objects
 */
async function hydrate ({ userIds, screenNames }) {
  const maxAllowed = 10
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
 * Sends a direct message from the authenticated user to a userId.
 * @note Endpoint docs: https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event
 * @param { String } id The numerical ID of the user
 * @param { String } message The text of the DM. Max 10,000 characters.
 * @param { String } token The sending user's OAuth access token.
 * @param { String } secret The sending user's OAuth access token secret.
 */
async function sendDirectMessage (id, message, token, secret) {
  const endpoint = 'https://api.twitter.com/1.1/direct_messages/events/new.json'
  const body = {
    event: {
      type: 'message_create',
      message_create: {
        target: { recipient_id: id },
        message_data: { text: message }
      }
    }
  }

  const { oAuthHeader } = twitterSignHmac({
    method: 'POST',
    url: endpoint,
    oAuthToken: token,
    oAuthTokenSecret: secret
  })

  const result = await makeTwitterCall({
    url: endpoint,
    body,
    oAuthHeader
  })
  return result
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
    defaultImage: user.default_profile_image,
    lastUpdate: Date.now()
  }
}

module.exports = {
  getRequestTokenAndGetRedirectUrl,
  redirectCallback,
  verifyCredentials,
  getFollowers,
  hydrate,
  sendDirectMessage
}
