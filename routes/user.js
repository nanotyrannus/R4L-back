'use strict';

let router = require('koa-router')();

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
    let polygons = yield ctx.pgClient.queryPromise(queryString);

    ctx.pgClient.end();
    ctx.body = polygons;
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
