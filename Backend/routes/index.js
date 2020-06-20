const express = require("express")
const cors = require("cors")
const router = express.Router()

const corsOptions = {
	origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "http://localhost:3000",
	optionsSuccessStatus: 200,
}

// router.options("/analyse/", cors(corsOptions))
// router.post("/analyse/", cors(corsOptions), sentimentController.analyseTextArray)

const twitter = require("../controllers/twitter")
router.get("/", async (req, res) => {
  const result = await twitter.getFollowers({ username: "balajis", limit: 10 })
  res.json(result)
})

module.exports = router
