'use strict';


let Router    = require('koa-router')
let db        = require("../shared/db.js")
let services  = require("../services.js")
var fs        = require("fs")
var jwt       = require("koa-jwt")

var home = process.env.HOME
var publicKey = fs.readFileSync(home + "/.ssh/radar.rsa.pub")
var privateKey = fs.readFileSync(home + "/.ssh/radar.rsa")

var publicRouter = new Router()
var protectedRouter = new Router()

publicRouter
  .get("/ping", function* () {
    let ctx = this
    var date = new Date()
    ctx.body = {
      "message" : "pong!",
      "time" : date.valueOf(),
      "date" : date
    }
  })
  .post("/user/create", function* () {
    let ctx = this;
    let salt = yield services.generateSalt();
    let body = ctx.request.body;
    var result = yield services.createUser(body.username, body.password, body.email, body.first_name, body.last_name, salt);
    if (result.success) {
      result.token = jwt.sign({"username" : result.username}, privateKey, {"algorithm" : "RS256"})
    }
    ctx.body = result;
  })
  .post("/user/login", function* () {
    let ctx = this;
    let body = ctx.request.body;
    var result = yield services.authenticateUser(body.username, body.password);
    if (result.success) {
      result.token = jwt.sign({"username" : result.username}, privateKey, {"algorithm" : "RS256"})
    }
    ctx.body = result;
  })

protectedRouter
  .get('/event/:id', function *(){
    var ctx = this
    var result = yield services.getEventPolygons(ctx.params.id)
    ctx.body = result;
  })
  .post('/event/:eventId/polygon/:polygonId', function* () { //set polygon color
    let ctx = this;
    let body = ctx.request.body;
    let params = ctx.params;
    let result = yield services.setPolygonColor(body.username, body.status, params.eventId, params.polygonId);
    ctx.body = result;
    // let queryString = 'INSERT INTO POLYGON (id,coordinates) VALUES (' + body.id + ',\'' + body.coordinates + '\')';
    // let result = yield db.query(queryString)
  })
  .post("/event", function* () {
    let ctx = this;
    let body = ctx.request.body;
    let result = yield services.addEvent(body.eventName);
    ctx.body = result;
  })
  .post("/event/:id", function* () {
    let ctx = this;
    let body = ctx.request.body;
    let result = yield services.addPolygons(body.featureCollection, ctx.params.id);
    ctx.body = result;
  })
  .get("/event", function* () {
    var ctx = this;
    var result = yield services.getEvents();
    ctx.body = result;
  })
  .get("/user/:username/event/:id", function* () {
    let ctx = this;
    let result = yield services.getUserPolygons(ctx.params.username, ctx.params.id);
    ctx.body = result;
  })


module.exports.protectedRoutes = protectedRouter.routes();
module.exports.publicRoutes = publicRouter.routes();
