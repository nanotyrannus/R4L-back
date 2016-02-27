'use strict';

let router = require('koa-router')()
let db = require("../shared/db.js")
let services = require("../services.js")


router
  .get("/ping", function* () {
    let ctx = this
    var date = new Date()
    ctx.body = {
      "message" : "pong!",
      "time" : date.valueOf(),
      "date" : date
    }
  })
  .get('/event/:id', function *(){
    var ctx = this
    var body = ctx.request.body
    try {
      var result = yield services.getEventPolygons(ctx.params.id)
    } catch (e) {
      result.message = e
      ctx.status = 404
    }
    ctx.body = result;
  })
  .post("/user/create", function* () {
    let ctx = this;
    let salt = yield services.generateSalt();
    let body = ctx.request.body;

    try {
      var result = yield services.createUser(body.user, body.password, salt);
    } catch (e) {
      result = {
        "user_id" : null,
        "success" : false,
        "message" : e.detail
      };
      ctx.status = 422;
    }
    ctx.body = result;
  })
  .post("/user/login", function* () {
    let ctx = this;
    let body = ctx.request.body;
    try {
      var result = yield services.authenticateUser(body.user, body.password);
    } catch (e) {
      result = {
        "user_id" : null,
        "message" : e
      };
      ctx.status = 401;
    }
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
