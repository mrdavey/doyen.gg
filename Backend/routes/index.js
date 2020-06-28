const express = require('express')
const cors = require('cors')
const { error } = require('../controllers/log')

const router = express.Router()

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000',
  optionsSuccessStatus: 200
}

// router.options("/analyse/", cors(corsOptions))
// router.post("/analyse/", cors(corsOptions), sentimentController.analyseTextArray)

const twitter = require('../controllers/twitter')
router.get('/', async (req, res) => {
  const userObj = await dataController.getUserData()
  if (userObj) {
    res.redirect('/app')
  } else {
    try {
      const redirectUrl = await twitter.getRequestTokenAndGetRedirectUrl()
      res.redirect(redirectUrl)
    } catch (e) {
      res.sendStatus(500, error(`A redirect error occured: ${e.message}`, false))
    }
  }
})

const dataController = require('../controllers/dataController')
// Needs to be same subdomain as TWITTER_OAUTH_CALLBACK_URL

router.get('/twitterOAuth', async (req, res) => {
  const accessTokens = await twitter.redirectCallback(req.query)
  const user = await twitter.verifyCredentials(accessTokens.oauth_token, accessTokens.oauth_token_secret)
  await dataController.saveUserData(accessTokens, user)
  res.redirect('/app')
})

router.get('/app', async (req, res) => {
  const userObj = await dataController.getUserData()
  if (userObj) {
    res.json(`Hi ${userObj.user.name} (${userObj.user.screenName})`)
  } else {
    res.json({ error: 'User not authenticated. Go to "/"' })
  }
})

const scheduler = require('../controllers/scheduler')
router.get('/fh', async (req, res) => {
  const userObj = await dataController.getUserData()
  if (userObj) {
    scheduler.fetchFollowersAndHydrate()
    res.json('Running fetch and hydrate...')
  } else {
    res.json({ error: 'User not authenticated. Go to "/"' })
  }
})

const { FILTERS } = require('../model/enums')

router.get('/filter', async (req, res) => {
  const userObj = await dataController.getUserData()
  if (userObj) {
    const filtered = await dataController.filterFollowers({ filter: FILTERS.MOST_ACTIVE_BY_F_RATIO, ratio: 1.2, minTimestamp: 1593374274659 })
    res.json(filtered)
  } else {
    res.json({ error: 'User not authenticated. Go to "/"' })
  }
})

router.get('/test', async (req, res) => {
  const userObj = await dataController.getUserData()
  const result = await twitter.hydrate({ userIds: ['15982471'], token: userObj.auth.token, tokenSecret: userObj.auth.tokenSecret })
  res.json(result)
})

router.get('/dm', async (req, res) => {
  const userObj = await dataController.getUserData()
  if (userObj) {
    const userIds = ['15982471', '1081']
    const message = 'Hi again. Test message from Doyen.gg'
    const result = await scheduler.sendDMs(userIds, message)
    res.json(result)
  } else {
    res.json({ error: 'User not authenticated. Go to "/"' })
  }
})

module.exports = router
