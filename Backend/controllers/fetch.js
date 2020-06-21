const fetch = require('node-fetch')
const { log, error } = require('./log')

async function makeRequest ({ url, body, headers, method = 'GET', isTextResponse = false }) {
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

  try {
    const result = !isTextResponse ? await response.json() : await response.text()
    log(`${parsedMethod} request successful, valid ${!isTextResponse ? 'JSON' : 'text'} body returned for url: ${shortenedUrl}`)
    return !isTextResponse ? result : queryStringToJson(result)
  } catch (e) {
    log(`${parsedMethod} request successful, no ${!isTextResponse ? 'JSON' : 'text'} body returned for url: ${shortenedUrl}`)
    return {}
  }
}

//
// Helpers
//

function queryStringToJson (queryString) {
  const pairs = queryString.split('&')
  const result = {}
  pairs.map(pair => {
    const components = pair.split('=')
    result[components[0]] = components[1] || ''
  })
  return result
}

module.exports = { makeRequest }
