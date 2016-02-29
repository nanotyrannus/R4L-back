'use strict';

let router    = require('koa-router')()
let db        = require("../shared/db.js")
let services  = require("../services.js")

router
  .get("/ping", function* () {
    let ctx = this
    var n = ctx.session.views || 0
    ctx.session.views = ++n
    var date = new Date()
    ctx.body = {
      "message" : "pong!",
      "time" : date.valueOf(),
      "date" : date,
      "views" : n
    }
  })
  .get('/event/:id', function *(){
    var ctx = this
    var result = yield services.getEventPolygons(ctx.params.id)
    ctx.body = result;
  })
  .post("/user/create", function* () {
    let ctx = this;
    let salt = yield services.generateSalt();
    let body = ctx.request.body;

    var result = yield services.createUser(body.username, body.password, salt);
    ctx.body = result;
  })
  .post("/user/login", function* () {
    let ctx = this;
    let body = ctx.request.body;
    var result = yield services.authenticateUser(body.username, body.password);
    ctx.body = result;
  })
  .post('/event/:eventId/polygon/:polygonId', function* () { //set polygon color
    let ctx = this;
    let body = ctx.request.body;
    let params = ctx.params;
    let result = yield services.setPolygonColor(body.username, body.color, params.eventId, params.polygonId);
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


module.exports = router.routes();
