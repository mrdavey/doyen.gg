const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')

const TYPES = {
  USER: 'user',
  FOLLOWERS: 'followers'
}

class LowDB {
  async _getDB (type) {
    const adapter = new FileAsync(`db/${type}.json`)
    this.db = low(adapter)
    return await this.db
  }

  async _get (type, key) {
    const db = await this._getDB(type)
    return db.get(key).value()
  }

  async _set (type, key, value) {
    const db = await this._getDB(type)
    return db.set(key, value).write()
  }

  // values is a dictionary
  async _add (type, key, values) {
    const db = await this._getDB(type)
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
  async _getAll (type) {
    const db = await this._getDB(type)
    return db.getState()
  }

  // get top X with key-value
  // filter = { key: 'value to filter by' }
  async _getTop ({ resultsToReturn, type, filter = null, keyToSort, desc = true }) {
    const db = await this._getDB(type)
    let result = db.get(type)
    if (filter) {
      result = result.filter(filter)
    }
    return result.sortBy(keyToSort).take(resultsToReturn).value()
  }

  // get number of keys in type
  async _getCount (type, key) {
    const db = await this._getDB(type)
    return db.get(key).size().value()
  }

  // Update record
  // oldValue + newValue = { key: value }
  async _update (type, key, oldValue, newValue) {
    const db = await this._getDB(type)
    return db.get(key).find(oldValue).assign(newValue).write()
  }

  async _remove (type, key, value) {
    const db = await this._getDB(type)
    return db.get(key).remove(value).write()
  }

  //
  // Public
  //

  async setUserAuthValues (dictValues) {
    return await this._set(TYPES.USER, 'auth', dictValues)
  }

  async setUserObjValues (dictValues) {
    return await this._set(TYPES.USER, 'user', dictValues)
  }

  async getUserEntity () {
    return await this._getAll(TYPES.USER)
  }

  async getDownloadedFollowersCursor () {
    const followersEntity = await this._getAll(TYPES.FOLLOWERS)
    const cursor = followersEntity && followersEntity.cursor ? followersEntity.cursor.next : null
    return cursor
  }

  async getUnhydratedFollowers () {
    const followersObj = await this._getAll(TYPES.FOLLOWERS)
    const followers = followersObj.followers || null
    if (followers) {
      const unhydrated = []
      Object.keys(followers).map(id => {
        if (!followers[id].hydrated) {
          unhydrated.push(id)
        }
        return null
      })
      return unhydrated
    }
    return null
  }

  async getOutdatedFollowers (staleDays) {
    const followersObj = await this._getAll(TYPES.FOLLOWERS)
    const followers = followersObj.followers || null
    if (followers) {
      const validIds = []
      Object.keys(followers).map((key) => {
        if (followers[key].lastUpdate) {
          const nowSeconds = Date.now() / 1000
          if (nowSeconds - followers[key].lastUpdate / 1000 > (staleDays * 24 * 60 * 60)) {
            validIds.push(key)
          }
        } else {
          validIds.push(key)
        }
      })
    }
    return null
  }

  async setDownloadedFollowersEntity (ids, nextCursor, prevCursor) {
    const dict = {}
    ids.map(id => {
      dict[id] = { hydrated: false }
      return null
    })
    await this._add(TYPES.FOLLOWERS, 'followers', dict)
    await this._set(TYPES.FOLLOWERS, 'cursor', { next: nextCursor, prev: prevCursor })
  }

  async hydrateFollowerIds (hydratedArray) {
    const dict = {}
    hydratedArray.map(hydrated => {
      dict[hydrated.id] = hydrated
      dict[hydrated.id].hydrated = true
      delete dict[hydrated.id].id
    })
    await this._add(TYPES.FOLLOWERS, 'followers', dict)
  }

  async getFollowerCount () {
    return await this._getCount(TYPES.FOLLOWERS, 'followers')
  }
}

module.exports = LowDB
