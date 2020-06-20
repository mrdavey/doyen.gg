const fetch = require("node-fetch")
const { log, error } = require("./log")

async function makeRequest({ url, body, headers, method = "GET" }) {
	const newHeaders = {
		"Content-Type": "application/json",
		...headers,
	}

	let fetchOptions = {}

	if (body) {
		fetchOptions = {
			method: "POST",
      body: newHeaders["Content-Type"] === "application/json" ?
        JSON.stringify(body) :
        body,
			headers: newHeaders,
		}
	} else {
		fetchOptions = {
			method: method,
			headers: newHeaders,
		}
	}

	const response = await fetch(url, fetchOptions).catch((e) => {
		error(`Request fail: ${e.message}`)
	})

	const status = response.status
	const statusText = response.statusText

	if (!status === 200) {
	  error(`Request response code: ${status}: ${statusText}`)
	}

	let result = await response.json().catch((e) => {
		// No JSON response body returned
		log(`Request successful, no JSON body returned for url: ${url}`)
		return {}
	})
	log(`Request successful, valid JSON body returned for url: ${url}`)
	return result
}

module.exports = { makeRequest }