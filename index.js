'use strict'

const koa = require('koa')
const cors = require("koa-cors")
const config = require('./config')
const KoaBody = require("koa-body")
const bodyParser = require('koa-bodyparser')
const services = require('./services')
const co = require('co')
const fs = require("fs")
const jwt = require("koa-jwt")
const adminRoutes = require("./routes/admin")

// koa app
const app = koa()

var home = process.env.HOME
var publicKey = fs.readFileSync(home + "/.ssh/radar.rsa.pub")
var privateKey = fs.readFileSync(home + "/.ssh/radar.rsa")
const key = fs.readFileSync(home + "/.ssh/radar.key")


app.use(cors({
  "credentials": true,
  "methods": ["GET", "POST", "DELETE"],
  "headers": ["Content-Type", "Authorization", "x-username"]
}))

app.use(bodyParser({
  "jsonLimit": "25mb"
}))

co.wrap(function* () {
  try {
    //inject postgres client as middleware
    yield services.init()
    app.use(function* (next) {
      var ctx = this
      if (!ctx.body) {
        ctx.body = {}
        ctx.body.status = ctx.status = 200
      }
      try {
        yield next
      } catch (e) {
        if (e.name === "UnauthorizedError") {
          /**
           * If there is a body, echo it back.
           * Else, send the error message.
           */
          let body = {}
          if (ctx.request.body) {
            body = ctx.request.body
          }
          ctx.body = {}
          ctx.body.message = e.message
          ctx.body.status = 403
          ctx.status = 403
        } else {
          ctx.body.message = e.message
          ctx.body.status = ctx.status = e.status
        }
        console.error(e)
        ctx.body.request = ctx.request.body //echo back request
      }
      // console.log(ctx.headers)
      console.log(`Line 57`, ctx.state.user)
    })
    let userRoutes = require('./routes/user')
    app.use(userRoutes.publicRoutes)
    app.use(jwt({
      "secret": key
      //"cookie" : "radarforlife_token" 
      // angular2 seems to ignore Set-Cookie headers.
      // for now manage webtoken at application level...
    }))
    // app.use(function* (next) {
    //   var ctx = this
    //   Was this a good idea in the first place? If the attacker can get
    //   the payload, he can see any headers.
    //   if (ctx.request.method !== "POST" || ctx.state.user.username === ctx.get("x-username")) {
    //   yield next
    //   } else {
    //     console.log(ctx.state.user.username, "\n", ctx.request.body.username)
    //     console.log("something happened\nsomething happened\nsomething happened\nsomething happened\nsomething happened\n")
    //     throw new UnauthorizedError("Token assignee mismatch.")
    //   }
    // })
    app.use(userRoutes.protectedRoutes)
    app.use(function* (next) {
      var ctx = this
      console.log("User authenticated: ", ctx.get("x-username"))
      if (yield services.isAdmin(ctx.get("x-username"))) {
        yield next
      } else {
        throw new UnauthorizedError("No admin privileges.")
      }
    })
    app.use(adminRoutes.routes)

    let port = config.port
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
