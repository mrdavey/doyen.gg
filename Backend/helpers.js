exports.convertTimestampToSeconds = (timestamp) => {
  return Number((timestamp / 1000).toFixed())
}
