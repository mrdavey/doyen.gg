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
  try {
    const redirectUrl = await twitter.getRequestTokenAndGetRedirectUrl()
    res.redirect(redirectUrl)
  } catch (e) {
    res.sendStatus(500, error(`A redirect error occured: ${e.message}`, false))
  }
})

let tempToken;
let tempTokenSecret;
let tempUser;

// Needs to be same subdomain as TWITTER_OAUTH_CALLBACK_URL

router.get('/twitterOAuth', async (req, res) => {
  const accessTokens = await twitter.redirectCallback(req.query)
  const user = await twitter.verifyCredentials(accessTokens.oauth_token, accessTokens.oauth_token_secret)

  // TODO: - Store user session
  tempToken = accessTokens.oauth_token
  tempTokenSecret = accessTokens.oauth_token_secret
  tempUser = user
  res.redirect('/app')
})

router.get('/app', async (req, res) => {
  if (tempToken && tempTokenSecret && tempUser) {
    res.json(`Hi ${tempUser.name} (${tempUser.screenName})`)
  } else {
    res.json({ error: 'User not authenticated. Go to "/"' })
  }
})

router.get('/dm', async (req, res) => {
  if (tempToken && tempTokenSecret && tempUser) {
    const userId = ''
    const message = 'Hi. Test message from Doyen.gg'
    const result = await twitter.sendDirectMessage(userId, message, tempToken, tempTokenSecret)
    res.json(result)
  } else {
    res.json({ error: 'User not authenticated. Go to "/"' })
  }
})

module.exports = router
