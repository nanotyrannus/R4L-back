'use strict';

let koa      = require('koa');
let postgres = require('pg');
let pg       = require('co-pg')(postgres);
let config   = require('./config');
let bodyParser = require('koa-bodyParser');

// koa app
let app = koa();

app.use(bodyParser());

//inject postgres client as middleware
app.use(function *(next) {
  let ctx = this;
  let client = new pg.Client(config.postgres);

  // connect database
  let pgClient = yield client.connectPromise();
  ctx.pgClient = pgClient;
  yield next;

});

let userRoutes = require('./routes/user');

app.use(userRoutes);

let port = process.env.port || config.port || 8282;
console.log("App is listenning on port: " + port);
app.listen(port);
