const fetch = require('node-fetch')
const { log, error } = require('./log')

async function makeRequest ({ url, body, headers, method = 'GET' }) {
  const newHeaders = {
    'Content-Type': 'application/json',
    ...headers
  }

  let fetchOptions = {}
  let parsedMethod = method

  if (body) {
    parsedMethod = 'POST'
    fetchOptions = {
      method: parsedMethod,
      body: newHeaders['Content-Type'] === 'application/json' ? JSON.stringify(body) : body,
      headers: newHeaders
    }
  } else {
    fetchOptions = {
      method: parsedMethod,
      headers: newHeaders
    }
  }

  const shortenedUrl = url.length > 100 ? `${url.slice(0, 100)}...` : url
  const response = await fetch(url, fetchOptions).catch((e) => {
    error(`${parsedMethod} request fail: ${e.message} for url: ${shortenedUrl}`)
  })

  const status = response.status
  const statusText = response.statusText

  if (!status === 200) {
    error(`${parsedMethod} request response code: ${status}: ${statusText} for url: ${shortenedUrl}`)
  }

  const result = await response.json().catch((e) => {
    // No JSON response body returned
    log(`${parsedMethod} request successful, no JSON body returned for url: ${shortenedUrl}`)
    return {}
  })
  log(`${parsedMethod} request successful, valid JSON body returned for url: ${shortenedUrl}`)
  return result
}

module.exports = { makeRequest }
