const { makeRequest } = require("./fetch")
const { log } = require("./log");
const { param } = require("../routes");

const key = process.env.TWITTER_KEY
const secret = process.env.TWITTER_SECRET
let bearerToken;

async function adminGetBearerToken() {

  log('Getting latest Twitter Bearer token')
	const headers = {
		Authorization: `Basic ${Buffer.from(key + ":" + secret).toString("base64")}`,
		"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
	}

	const result = await makeRequest({
		url: "https://api.twitter.com/oauth2/token",
		method: "POST",
		body: "grant_type=client_credentials",
		headers: headers,
	})

  // Token is only scoped to this file
  bearerToken = result.access_token
  log(`Bearer token received: ${bearerToken.slice(0, 3)}...${bearerToken.slice(bearerToken.length - 8, bearerToken.length - 1)}`)
}

async function makeTwitterCall({ url, body, method }) {
  if (!bearerToken) {
    await adminGetBearerToken()
  }

	const headers = {
		Authorization: `Bearer ${bearerToken}`,
		"Content-Type": "application/json",
	}

	return await makeRequest({ url, body, headers, method })
}

/**
 * Get follower IDs of a user
 * @param { String } userId Optional. The user's ID (usually a large number). If undefined, `username` must be included.
 * @param { String } username Optional. The user's ID (usually a large number). If undefined, `userId` must be included.
 * @param { String } cursor Optional. The cursor used for paging through followers.
 * @param { Number } limit Optional. The limit of IDs to fetch. Default and max is 5000.
 * @returns { { ids: String[], next: String, previous: String, error: String } } An array of twitter string IDs, the cursor for next page, the cursor for current page, error if relevant
 */
async function getFollowers({ userId, username, cursor, limit }) {
  let params = `stringify_ids=true`

  if (userId) {
    params += `&user_id=${userId}`
  } else {
    if (!username) throw Error(`No twitter userId or username included in getFollowers()!`)
    params += `&screen_name=${username}`
  }

  if (cursor) params += `&cursor=${cursor}`
  if (limit) params += `&count=${limit}`

  const result = await makeTwitterCall({
		url: `https://api.twitter.com/1.1/followers/ids.json?${params}`,
  }).catch(e => {
    return { ids: null, next: null, previous: null, error: e.message }
  })

  return {
    ids: result.ids,
    next: result.next_cursor_str,
    previous: result.previous_cursor_str,
  }
}

async function hydrateIds({ ids }) {

}

async function sendDirectMessage({ id, message }) {
  
}

module.exports = {
  getFollowers
}