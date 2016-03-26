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
        if (e.name === "UnauthorizedError") {
          let body = {}
          if (ctx.request.body) body = ctx.request.body
          ctx.body = e
          ctx.body.status = 403
        } else {
          throw e
        }
        ctx.body.request = ctx.request.body //echo back request
      }
      console.log(ctx.state.user)
    })
    
    let userRoutes = require('./routes/user')
    app.use(userRoutes.publicRoutes)
    app.use(jwt({
      "secret" : publicKey,
      "algorithm" : "RS256"
    }))
    app.use(function* (next) {
      var ctx = this
      if (ctx.request.method !== "POST" || ctx.state.user.username === ctx.request.body.username) {
        yield next
      } else {
        console.log(ctx.state.user.username, "\n", ctx.request.body.username)
        throw {
          "name" : "UnauthorizedError",
          "message" : "Token assignee mismatch.",
          "status" : 403
        }
      }
    }) 
    app.use(userRoutes.protectedRoutes)
    let port = config.port || process.env.port || 8282
    app.listen(port)
    console.log("App is listenning on port: " + port)
  } catch (e) {
    console.log(e)
  }
})()
