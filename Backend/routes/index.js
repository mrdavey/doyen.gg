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
  // const result = await twitter.getFollowers({ username: "balajis", limit: 10 })
  const result = await twitter.hydrate({
    userIds: [
      '560818101',
      '1186433930477490183',
      '4886939733',
      '22135848',
      '2616472891',
      '1274352571612831744',
      '1046706504324304897',
      '1274090521321930758',
      '2379915792',
      '1369152438'
    ]
  })
  res.json(result)
})

module.exports = router
