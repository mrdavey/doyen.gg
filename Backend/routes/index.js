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

router.get('/followers', async (req, res) => {
  const userObj = await dataController.getUserData()
  if (userObj) {
    const beforeAfter = await dataController.downloadFollowerIds(userObj.user.id)
    res.json(beforeAfter)
  } else {
    res.json({ error: 'User not authenticated. Go to "/"' })
  }
})

router.get('/hydrate', async (req, res) => {
  const userObj = await dataController.getUserData()
  if (userObj) {
    const followers = await dataController.getDownloadedFollowers()
    if (followers) {
      const count = await dataController.hydrateFollowers(followers)
      res.json({ count })
    } else {
      res.json({ error: 'No followers downloaded yet' })
    }
  } else {
    res.json({ error: 'User not authenticated. Go to "/"' })
  }
})

// router.get('/dm', async (req, res) => {
//   const userObj = await dataController.getUserData()
//   if (userObj) {
//     const userId = ''
//     const message = 'Hi. Test message from Doyen.gg'
//     const result = await twitter.sendDirectMessage(userId, message, userObj.auth.token, userObj.auth.tokenSecret)
//     res.json(result)
//   } else {
//     res.json({ error: 'User not authenticated. Go to "/"' })
//   }
// })

module.exports = router
