'use strict';

const Router = require('koa-router')
const db = require("../shared/db.js")
const services = require("../services.js")
const fs = require("fs")
const cofs = require("co-fs")
const jwt = require("koa-jwt")
const KoaBody = require("koa-body")
const os = require("os")

var home = process.env.HOME
var publicKey = fs.readFileSync(home + "/.ssh/radar.rsa.pub")
var privateKey = fs.readFileSync(home + "/.ssh/radar.rsa")
const key = fs.readFileSync(home + "/.ssh/radar.key")

var publicRouter = new Router()
var protectedRouter = new Router()

var koaBody = new KoaBody({
  multipart: true,
  formidable: {
    "uploadDir": __dirname,
    "keepExtensions": true
  }
})

publicRouter
  .post("/prep", function* () {
    /**
     * Test for prepared statement. Can delete
     * {
     * "name" : "prepared_test",
     * "text" : "insert into test values ($1)",
     * "values": ["Robert'); DROP TABLE students; --"]
     * }
     */
    let ctx = this
    yield db.query(ctx.request.body)
  })
  .get("/ping", function* () {
    let ctx = this
    var date = new Date()
    ctx.body = {
      "message": "pong!",
      "time": date.valueOf(),
      "date": date
    }
  })
  .post("/ping", function* () {
    var ctx = this
    var date = new Date()
    ctx.body = {
      "message": "pong!",
      "time": date.valueOf(),
      "date": date,
      "request": ctx.request.body
    }
  })
  .post("/user/create", function* () {
    let ctx = this;
    let salt = yield services.generateSalt();
    let body = ctx.request.body;
    var result = yield services.createUser(body.username, body.password, body.email, body.first_name, body.last_name, salt);
    ctx.body = result;
  })
  .post("/user/login", function* () {
    let ctx = this;
    console.log("Decoded: " + ctx.state.user)
    let body = ctx.request.body;
    var result = yield services.authenticateUser(body.username, body.password);
    ctx.body = result;
  })

protectedRouter
  .get("/ping_", function* () { //protected ping
    this.body = {
      "status": 200,
      "message": "pong_!",
      "date": new Date()
    }
  })
  .get('/event/:id/list', function*() { // Returns list of polygons
    var ctx = this
    var result = yield services.getPolygonList(ctx.params.id)
    console.log(`fucking event/:id/list`,result)
    ctx.body = result
  })
  .get('/event/:id', function* () {
    var ctx = this
    var result = yield services.getEventPolygons(ctx.params.id)
    ctx.body = result
  })
  .get('/event/:id/data', function* () {
    var ctx = this
    var result = yield services.getEventTotals(ctx.params.id)
    ctx.body = result
  })
  .post('/event/:eventId/polygon/:polygonId', function* () { //set polygon color
    let ctx = this
    let body = ctx.request.body
    let params = ctx.params
    let result = yield services.setPolygonColor(body.username, body.status, params.eventId, params.polygonId);
    ctx.body = result
    // let queryString = 'INSERT INTO POLYGON (id,coordinates) VALUES (' + body.id + ',\'' + body.coordinates + '\')';
    // let result = yield db.query(queryString)
  })
  .post("/event", koaBody, function* () {
    let file = this.request.body.files.file
    // console.log(file)
    this.body = {}
    try {
      //let newFilePath = `${os.homedir()}/radarforlife/events/${file.name}`

      // if (yield cofs.exists(newFilePath)) {
      //   throw new Error(`Filename already exists: ${ file.name }`)
      // }
      // yield cofs.rename(this.request.body.files.file.path, newFilePath) //move to events folder
      let localFile = yield cofs.readFile(file.path)
      let parsedLocalFile = JSON.parse(localFile.toString("utf-8"))

      // Add to database with filename as temp eventName
      let result = yield services.addEvent(file.name, "No description.", "")
      if (result.success) {
        yield services.addPolygons(parsedLocalFile, result.event_id)
        cofs.unlink(file.path)
      }
    } catch (e) {
      this.status = this.body.status = 500
      this.body.message = e
      console.error(e)
    }

    // let ctx = this
    // let body = ctx.request.body
    // let result = yield services.addEvent(body.eventName, body.description || "", body.imageUrl || "")

    // if (result.success && body.featureCollection) {
    //   result.result = yield services.addPolygons(body.featureCollection, result.event_id)
    // }
    // ctx.body = result;
    /**
     * TO-do 
     * use body-parser instead of accepting
     * json strings
     */
  })
  .delete("/event/:id", function* () {
    var ctx = this
    var body = ctx.request.body
    var result = yield services.deleteEvent(ctx.params.id)
    ctx.body = result
  })
  .post("/event/:id", function* () {
    /**
     * Change event metadata
     */
    let ctx = this
    console.log(ctx.request)
  })
  .get("/event", function* () {
    var ctx = this
    var result = yield services.getEvents()
    ctx.body = result
  })
  /**
   * Input: comma delimited list of polygon ids, event id
   * Returns  polygons
   */
  .post("/user/:username/event/:id/polygon/:ids", function* () {
    var ctx = this
    params = ctx.params
    var result = `username: ${ params.username }, event: ${ params.id }, id list: ${ ids.join(", ") }`
    ctx.body = result
  })
  .get("/user/:username/event/:id", function* () {
    var ctx = this
    var params = ctx.params
    var query = ctx.query
    var bounds = {
      "minLng": query.minLng,
      "minLat": query.minLat,
      "maxLng": query.maxLng,
      "maxLat": query.maxLat
    }
    console.log(`QUERY: `, ctx.request.querystring)
    var result
    if (query.ids) {
      console.log(`IDs recieved: ${query.ids}`)
      result = yield services.getUserPolygonsInArea(params.username, params.id, query.ids)
    } else if (ctx.request.querystring) {
      console.log(`Parameters detected! Executing getUserPolygonsInArea`)
      result = yield services.getUserPolygonIdsInArea("", params.id, bounds)
    } else {
      console.log(`No parameters detected. Executing getUserPolygons`)
      result = yield services.getUserPolygons(ctx.params.username, ctx.params.id)
    }
    console.log("================ REQUEST ================\n", ctx.request.body)
    ctx.body = result
  })
  .post("/user/:username/event/:id", function* () {
    var ctx = this
    var body = ctx.request.body
    var params = ctx.params
    var bounds = {
      "minLng": params.minLng,
      "minLat": params.minLat,
      "maxLng": params.maxLng,
      "maxLat": params.maxLat
    }
    var result = yield services.getUserPolygons(ctx.params.username, ctx.params.id, bounds)
    //var result  = yield services.getUserPolygonsInArea(ctx.params.username, ctx.params.id, bounds.min_lng, bounds.max_lng, bounds.min_lat, bounds.max_lat)
    ctx.body = result
  })


module.exports.protectedRoutes = protectedRouter.routes();
module.exports.publicRoutes = publicRouter.routes();
