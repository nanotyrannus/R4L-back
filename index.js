'use strict';

let koa      = require('koa');
let postgres = require('pg');
let pg       = require('co-pg')(postgres);
let config   = require('./config');
let bodyParser = require('koa-bodyparser');
let db = require("./shared/db.js")("hello from module in index.js");


// koa app
let app = koa();

app.use(bodyParser());

//inject postgres client as middleware
app.use(function *(next) {
  let ctx = this;
  ctx.body = "start: " + (new Date().valueOf()) + " "
  // let client = new pg.Client(config.postgres);
  // // connect database
  // let pgClient = yield client.connectPromise();
  // ctx.pgClient = pgClient;
  let connectionResults = yield pg.connectPromise(config.postgres);
  ctx.client = connectionResults[0];
  ctx.done = connectionResults[1];

  yield next;
  ctx.body += "end: " + (new Date().valueOf()) + " "
});

let userRoutes = require('./routes/user');

app.use(userRoutes);

let port = process.env.port || config.port || 8282;
console.log("App is listenning on port: " + port);
app.listen(port);
