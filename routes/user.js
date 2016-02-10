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
  .get('/polygons', function *(){
    let ctx = this;

    let queryString = 'SELECT * FROM POLYGON';
    let result = yield db.query(queryString);

    ctx.body += JSON.stringify(result["rows"])
  })
  .post("/signup", function* (){

  })
  .post("/login", function* (){
    
  })
  .post('/polygon', function* () { //set polygon color
    let ctx = this;
    let body = ctx.request.body;

    let result = yield services.setPolygonColor(body.username, body.color, body.event_id, body.polygon_id);
    ctx.body = JSON.stringify(body);
    // let queryString = 'INSERT INTO POLYGON (id,coordinates) VALUES (' + body.id + ',\'' + body.coordinates + '\')';
    // let result = yield db.query(queryString)
  })
  .post("/event", function* () {
    let ctx = this

  })


module.exports = router.routes();