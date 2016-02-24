'use strict';

let router = require('koa-router')();
let db = require("../shared/db.js");
let services = require("../services.js");
let send = require("koa-send");

let front = process.env.R4L_FRONT || "/home/ubuntu/radarforlife/front/"

router
  .get("/", function* () {
    let ctx = this;
    if (ctx.path === "/") {
      console.log("Index requested:", front + "public/index.html");
      yield send(ctx, front + "public/index.html");
    } else {
      //Default value for root is not root, but the location of source code file.
      yield send(ctx, ctx.path, {"root": process.env.R4L_FRONT + "/public"});
    }
  })
  .get("/ping", function* () {
    let ctx = this;
    ctx.body = {
      "message" : "pong!",
      "time" : new Date()
    };
  })
  .get('/polygon/:id', function* () {
    let ctx = this;

    let queryString = 'SELECT FROM POLYGON WHERE id = ' + ctx.params.id;
    let result = yield db.query(queryString);


    ctx.body = JSON.stringify(result["rows"]);
  })
  .get('/polygons/:id', function *(){
    let ctx = this;
    let body = ctx.request.body;
    let result = yield services.getPolygons(ctx.params.id);

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
    ctx.body = JSON.stringify(body);
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
  .get("/events", function* () {
    let ctx = this;
    let result = yield services.getEvents();
    ctx.body = result;
  })
  .get("/events/:id/:username", function* () {
    let ctx = this;
    console.log("params: " + ctx.params.username + " " + ctx.params.id);
    let result = yield services.getUserPolygonColors(ctx.params.username, ctx.params.id);

    ctx.body = result;
  })


module.exports = router.routes();
