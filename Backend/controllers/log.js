const m = require('moment')

function log (message) {
  console.log(`${m().format()} | Log: ${message}`)
}

function error (message, shouldThrow = true) {
  console.log(`${m().format()} | Error: ${message}`)
  if (shouldThrow) {
    throw Error(message)
  } else {
    return message
  }
}

module.exports = {
  log,
  error
}
