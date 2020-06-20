const m = require('moment')

function log(message) {
  console.log(`${m().format()} | Log: ${message}`)
}

function error(message) {
  console.log(`${m().format()} | Error: ${message}`)
  throw Error(message)
}

module.exports = {
  log,
  error
}