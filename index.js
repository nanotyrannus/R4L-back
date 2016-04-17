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
var adminRoutes = require("./routes/admin")

// koa app
let app = koa()

var home = process.env.HOME
var publicKey = fs.readFileSync(home + "/.ssh/radar.rsa.pub")
var privateKey = fs.readFileSync(home + "/.ssh/radar.rsa")


app.use(cors({
  "credentials" : true,
  "methods" : ["GET", "POST", "DELETE"],
  "headers" : ["Content-Type","Authorization", "x-username"]
}))
app.use(bodyParser({
  "jsonLimit" : "25mb"
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
      if (ctx.request.method !== "POST" || ctx.state.user.username === ctx.get("x-username")) {
        yield next
      } else {
        console.log(ctx.state.user.username, "\n", ctx.request.body.username)
        throw new UnauthorizedError("Token assignee mismatch.")
      }
    })
    app.use(userRoutes.protectedRoutes)
    app.use(function* (next) {
      var ctx = this
      console.log("final middleware reached by", ctx.get("x-username"))
      if (yield services.isAdmin(ctx.get("x-username"))) {
        yield next
      } else {
        throw new UnauthorizedError("No admin privileges.")
      }
    })
    app.use(adminRoutes.routes)

    let port = config.port || process.env.port || 8282
    app.listen(port)
    console.log("App is listenning on port: " + port)
  } catch (e) {
    console.log(e)
  }
})()

var UnauthorizedError = function (message) {
  this.name = UnauthorizedError
  this.message = message
  this.stack = (new Error()).stack
  this.status = 403
}
