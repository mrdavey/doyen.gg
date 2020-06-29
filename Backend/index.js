const express = require('express')
const path = require('path')
require('dotenv').config()

const { log } = require('./controllers/log')
const indexRouter = require('./routes/index')
const bodyParser = require('body-parser')

const app = express()
const PORT = process.env.PORT || 3001

app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())
app.use('/', indexRouter)
app.listen(PORT, () => log(`Listening on http://localhost:${PORT}`))
