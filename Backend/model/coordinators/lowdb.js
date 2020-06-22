const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')

class LowDB {
  async getDB (type) {
    const adapter = new FileAsync(`db/${type}.json`)
    this.db = low(adapter)
    return await this.db
  }

  async get (type, key) {
    const db = await this.getDB(type)
    return db.get(key).value()
  }

  async set (type, key, value) {
    const db = await this.getDB(type)
    return db.set(key, value).write()
  }

  // return all keys and values of type

  // get top X with key-value

  // get number of keys in type

  // remove a key-value

  // find by key-value
}

module.exports = LowDB
