const m = require('moment')

function network (message) {
  console.log(`${m().format()} | 📶 Network: ${message}`)
}
function log (message) {
  console.log(`${m().format()} | 💬 Log: ${message}`)
}

function info (message) {
  console.log(`${m().format()} | 👀 Info: ${message}`)
}

function error (message, shouldThrow = true) {
  console.log(`${m().format()} | ⚠️ Error: ${message}`)
  if (shouldThrow) {
    throw Error(message)
  } else {
    return message
  }
}

module.exports = {
  network,
  log,
  info,
  error
}
