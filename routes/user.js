'use strict';

let router = require('koa-router')();
let db = require("../shared/db.js");
let services = require("../services.js");

router
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

    ctx.body = JSON.stringify(result)
  })
  .post("/signup", function* (){
    let ctx = this;
    let salt = yield services.generateSalt();
    let body = ctx.request.body;
    let result = yield services.createUser(body.username, body.password, salt);
    ctx.body = JSON.stringify(result);
  })
  .post("/login", function* (){
    let ctx = this;
    let body = ctx.request.body;
    let result = yield services.authenticateUser(body.username, body.password);
    ctx.body = JSON.stringify(result);
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
    let result = yield services.addPolygons(body.featureCollection, body.eventId);
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
