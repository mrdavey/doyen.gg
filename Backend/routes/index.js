const express = require('express')
const cors = require('cors')
const router = express.Router()

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000',
  optionsSuccessStatus: 200
}

// router.options("/analyse/", cors(corsOptions))
// router.post("/analyse/", cors(corsOptions), sentimentController.analyseTextArray)

const twitter = require('../controllers/twitter')
router.get('/', async (req, res) => {
  const result = await twitter.getRequestToken()
  const url = twitter.redirect(result.token)
  console.log(url)
  res.json({ url })
})

router.get('/callback', async (req, res) => {
  const accessTokens = await twitter.redirectCallback(req.query)
  const user = await twitter.verifyCredentials(accessTokens.oauth_token, accessTokens.oauth_token_secret)
  res.json(user)
})

module.exports = router
