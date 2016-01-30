'use strict';

let router = require('koa-router')();
let db = require("../shared/db.js");

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
  .post('/polygon', function* () {
    let ctx = this;
    let body = ctx.request.body;

    let queryString = 'INSERT INTO POLYGON (id,coordinates) VALUES (' + body.id + ',\'' + body.coordinates + '\')';
    let result = yield db.query(queryString);

    ctx.body = JSON.stringify(result);
  })


module.exports = router.routes();
