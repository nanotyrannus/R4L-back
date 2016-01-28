'use strict';

let router = require('koa-router')();
let db = require("../shared/db.js")("hello from module in user.js");

router
  .get('/polygon/:id', function* () {
    let ctx = this;

    let queryString = 'SELECT FROM POLYGON WHERE id = ' + ctx.params.id;
    let polygon = yield ctx.pgClient.queryPromise(queryString);

    ctx.pgClient.end();
    ctx.body = polygon;

  })
  .get('/polygons', function *(){
    let ctx = this;
    let queryString = 'SELECT * FROM POLYGON';
    let polygons = yield ctx.client.queryPromise(queryString);
    ctx.done()
    //ctx.pgClient.end();
    ctx.body += polygons["rows"].join(" ");
  })
  .post('/polygon', function* () {
    let ctx = this;
    let body = ctx.request.body;

    let queryString = 'INSERT INTO POLYGON (id,coordinates) VALUES (' + body.id + ',\'' + body.coordinates + '\')';
    let polygon = yield ctx.pgClient.queryPromise(queryString);

    ctx.pgClient.end();
    ctx.body = polygon;
  })


module.exports = router.routes();
