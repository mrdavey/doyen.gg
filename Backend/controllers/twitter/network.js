const { twitterSignHmac } = require('./authSign')
const { makeRequest } = require('../fetch')
const { log, error } = require('../log')

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

//
// Exports
//

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

/**
 * OAuth v.1.0: Step 1 of 'Log in with Twitter'.
 * Docs: https://developer.twitter.com/en/docs/basics/authentication/api-reference/request_token
 * @note Receives the OAuth request token and secret for authenticating the user.
 */
async function getRequestToken () {
  const callback = encodeURI(process.env.TWITTER_OAUTH_CALLBACK_URL)
  const endpoint = 'https://api.twitter.com/oauth/request_token'

  const { oAuthHeader } = twitterSignHmac({
    method: 'POST',
    url: endpoint,
    extraParams: { oauth_callback: callback }
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
function getRedirectUrl (oAuthToken) {
  return `https://api.twitter.com/oauth/authenticate?oauth_token=${oAuthToken}`
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

module.exports = {
  makeTwitterCall,
  getRequestToken,
  getRedirectUrl,
  getAccessToken
}
