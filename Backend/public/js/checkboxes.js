window.serialize = function serialize (number) {
  let values = [].filter.call(document.getElementsByName('id'), function (c) {
    return c.checked
  }).map(function (c) {
    return c.value
  })
  if (number) {
    values = values.slice(0, number)
  }
  document.getElementById('ids').value = values
}
