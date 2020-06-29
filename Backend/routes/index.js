const express = require('express')
const router = express.Router()

const twitter = require('../controllers/twitter')
const dataController = require('../controllers/dataController')
const scheduler = require('../controllers/scheduler')
const { getTimeLeftFromNow } = require('../helpers')

router.get('/', async (req, res) => {
  const twitterKey = process.env.TWITTER_KEY
  const twitterSecret = process.env.TWITTER_SECRET
  const twitterCallback = process.env.TWITTER_OAUTH_CALLBACK_URL

  if (!twitterKey || !twitterSecret || !twitterCallback) {
    return res.render('failure', {
      error: "You haven't set up your .env file properly yet. Make sure you follow the README.MD instructions carefully."
    })
  }

  const userObj = await dataController.getUserData()
  if (userObj) {
    res.redirect('/app')
  } else {
    res.render('login')
  }
})

router.get('/login', async (req, res) => {
  try {
    const redirectUrl = await twitter.getRequestTokenAndGetRedirectUrl()
    res.redirect(redirectUrl)
  } catch (e) {
    res.render('failure', { error: `A redirect error occured: ${e.message}` })
  }
})

// Needs to be same subdomain as TWITTER_OAUTH_CALLBACK_URL
router.get('/twitterOAuth', async (req, res) => {
  const accessTokens = await twitter.redirectCallback(req.query)
  const user = await twitter.verifyCredentials(accessTokens.oauth_token, accessTokens.oauth_token_secret)
  await dataController.saveUserData(accessTokens, user)
  res.redirect('/app')
})

router.get('/app', async (req, res) => {
  const userObj = await dataController.getUserData()
  const followersLoaded = await dataController.getFollowersLoaded() || 0
  if (userObj) {
    res.render('index', {
      username: userObj.user.name,
      screenName: userObj.user.screenName,
      followersLoaded,
      ids: []
    })
  } else {
    res.redirect('/login')
  }
})

router.post('/app', async (req, res) => {
  const userObj = await dataController.getUserData()
  const followersLoaded = await dataController.getFollowersLoaded() || 0
  if (userObj) {
    const { ids } = req.body

    res.render('index', {
      username: userObj.user.name,
      screenName: userObj.user.screenName,
      followersLoaded,
      ids
    })
  } else {
    res.redirect('/login')
  }
})

router.get('/fh', async (req, res) => {
  const userObj = await dataController.getUserData()
  if (userObj) {
    scheduler.fetchFollowersAndHydrate()
    return res.render('success', {
      message: 'Running fetch and hydrate in the background. Check your open terminal.'
    })
  } else {
    res.render('failure', {
      error: 'You are not logged in yet.'
    })
  }
})

const { FILTERS } = require('../model/enums')

router.get('/filter', async (req, res) => {
  const userObj = await dataController.getUserData()
  if (userObj) {
    const filtered = await dataController.filterFollowers({ filter: FILTERS.MOST_ACTIVE_BY_F_RATIO, ratio: 0.8 })
    return res.render('filter', {
      followers: filtered
    })
  } else {
    res.render('failure', {
      error: 'You are not logged in yet.'
    })
  }
})

router.post('/dm', async (req, res) => {
  const userObj = await dataController.getUserData()
  if (userObj) {
    const { ids, message, coldrun } = req.body
    const userIds = ids.replace(' ', '').split(',')
    const isColdRun = coldrun === undefined ? false : coldrun

    if (userIds.length > 0 && message) {
      const result = await scheduler.sendDMs(userIds, message, isColdRun)
      const success = `DMs ${isColdRun ? 'would have been ' : ''}sent to ${userIds.length} IDs. You ${isColdRun ? 'would ' : ''}have ${
        result.remaining
      } DMs left to send for the next ${getTimeLeftFromNow(result.periodEnds)} hours${isColdRun ? ' if this wasn\'t a cold run' : ''}.`
      res.render('success', {
        message: success
      })
    } else {
      res.render('failure', {
        error: 'Missing field'
      })
    }
  } else {
    res.render('failure', {
      error: 'You are not logged in yet.'
    })
  }
})

module.exports = router
