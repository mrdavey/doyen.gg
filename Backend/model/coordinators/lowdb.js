const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')

class LowDB {
  async getDB(type) {
    const adapter = new FileAsync(`db/${type}.json`)
    this.db = low(adapter)
    return await this.db
  }

  async get(type, key) {
    const db = await this.getDB(type)
    return db.get(key).value()
  }

  async set(type, key, value) {
    const db = await this.getDB(type)
    return db.set(key, value).write()
  }

  // values is a dictionary
  async add (type, key, values) {
    const db = await this.getDB(type)
    const current = db.get(key).cloneDeep().value()
    if (current) {
      Object.keys(values).map(valueKey => {
        current[valueKey] = values[valueKey]
      })
      return db.set(key, current).write()
    } else {
      return db.set(key, values).write()
    }
  }

  // return all keys and values of type
  async getAll(type) {
    const db = await this.getDB(type)
    return db.getState()
  }

  // get top X with key-value
  // filter = { key: 'value to filter by' }
  async getTop({ resultsToReturn, type, filter = null, keyToSort, desc = true }) {
    const db = await this.getDB(type)
    let result = db.get(type)
    if (filter) {
      result = result.filter(filter)
    }
    return result.sortBy(keyToSort).take(resultsToReturn).value()
  }

  // get number of keys in type
  async getCount(type, key) {
    const db = await this.getDB(type)
    return db.get(key).size().value()
  }

  // Update record
  // oldValue + newValue = { key: value }
  async update(type, key, oldValue, newValue) {
    const db = await this.getDB(type)
    return db.get(key).find(oldValue).assign(newValue).write()
  }

  async remove(type, key, value) {
    const db = await this.getDB(type)
    return db.get(key).remove(value).write()
  }
}

module.exports = LowDB
