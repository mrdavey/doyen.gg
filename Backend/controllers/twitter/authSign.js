const crypto = require('crypto')

/**
 * Creates the OAuth v.1.0 signature and header required for some Twitter endpoints (e.g. Direct messaging)
 * @note Docs: https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a/creating-a-signature
 * @param { String } method The http method, usually POST.
 * @param { String } url The Twitter URL endpoint.
 * @param { String } extraParams Optional. Any extra params that need to be encoded.
 * @param { String } oAuthToken Optional. The OAuthToken given to us when user authenticates via Twitter.
 * @param { String } oAuthTokenSecret Optional. The OAuthTokenSecret once OAuth permission is granted.
 * @returns { { String, String }} Returns the encoded oAuthHeader and oAuthSignature.
 */
function twitterSignHmac ({ method, url, extraParams, oAuthToken, oAuthTokenSecret }) {
  const oAuthConsumerKey = process.env.TWITTER_KEY
  const oAuthNonce = (Date.now() * Math.random()).toFixed()
  const oAuthSigMethod = 'HMAC-SHA1'
  const oAuthTimestamp = (Date.now() / 1000).toFixed()
  const oAuthVersion = '1.0'

  const params = {
    ...extraParams,
    oauth_consumer_key: oAuthConsumerKey,
    oauth_nonce: oAuthNonce,
    oauth_signature_method: oAuthSigMethod,
    oauth_timestamp: oAuthTimestamp,
    oauth_version: oAuthVersion
  }

  if (oAuthToken) {
    params.oauth_token = oAuthToken
  }

  const alphabeticalParams = Object.keys(params)
    .sort()
    .map(key => {
      return `${oAuthEncode(key)}=${oAuthEncode(params[key])}`
    })

  const paramsString = alphabeticalParams.join('&')
  const sigBaseString = `${method.toUpperCase()}&${oAuthEncode(url)}&${oAuthEncode(paramsString)}`
  const signingKey = `${oAuthEncode(process.env.TWITTER_SECRET)}&${oAuthTokenSecret ? oAuthEncode(oAuthTokenSecret) : ''}`

  // Create HMAC
  const hmac = crypto.createHmac('sha1', signingKey)
  // Sign base string
  const oAuthSignature = hmac.update(sigBaseString).digest('base64')

  // Create encoded OAuth header
  const headerParams = Object.keys(params)
    .map((key) => {
      return `${oAuthEncode(key)}="${oAuthEncode(params[key])}"`
    })

  headerParams.push(`oauth_signature="${oAuthEncode(oAuthSignature)}"`)
  headerParams.sort()

  const header = `OAuth ${headerParams.join(', ')}`

  return { oAuthHeader: header, oAuthSignature }
}

//
// Helpers
//

function oAuthEncode (string) {
  let value = encodeURIComponent(string)
  value = value.replace(/!/g, '%21') // !
  value = value.replace(/\*/g, '%2A') // *
  value = value.replace(/'/g, '%27') // '
  value = value.replace(/\)/g, '%29') // )
  value = value.replace(/\(/g, '%28') // (
  return value
}

module.exports = {
  twitterSignHmac
}
