'use strict'

var koa         = require('koa')
var cors        = require("koa-cors")
var config      = require('./config')
var bodyParser  = require('koa-bodyparser')
var services    = require('./services')
var co          = require('co')
var session     = require("koa-session")
var fs          = require("fs")
var jwt         = require("koa-jwt")

// koa app
let app = koa()

var home = process.env.HOME
var publicKey = fs.readFileSync(home + "/.ssh/radar.rsa.pub")
var privateKey = fs.readFileSync(home + "/.ssh/radar.rsa")


app.use(cors())
app.use(bodyParser({
  "jsonLimit" : "5mb"
}))

co.wrap(function* () {
  try {
    //inject postgres client as middleware
    yield services.init()
    app.use(function *(next) {
      var ctx = this
      try {
        yield next
      } catch (e) {
        console.log(e)
        if (e.name === "UnauthorizedError") {
          console.log("Running catch body")
          let body = {}
          if (ctx.request.body) body = ctx.request.body
          body.error = "Unauthorized token"
          body.status = 403
          ctx.body = body
        }
      }
    })
    
    let userRoutes = require('./routes/user')
    app.use(userRoutes.publicRoutes)
    app.use(jwt({
      "secret" : publicKey,
      "algorithm" : "RS256"
    }))
   
    app.use(userRoutes.protectedRoutes)
    let port = config.port || process.env.port || 8282
    app.listen(port)
    console.log("App is listenning on port: " + port)
  } catch (e) {
    console.log(e)
  }
})()
