exports.convertTimestampToSeconds = (timestamp) => {
  return Number((timestamp / 1000).toFixed())
}

exports.getTimeLeftFromNow = (futureTimestamp) => {
  const secondsLeft = futureTimestamp - this.convertTimestampToSeconds(Date.now())
  return (secondsLeft / 3600).toFixed(2)
}