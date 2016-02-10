'use strict';

let koa      = require('koa');

let config   = require('./config');
let bodyParser = require('koa-bodyparser');


// koa app
let app = koa();

app.use(bodyParser());

//inject postgres client as middleware
app.use(function *(next) {
  let ctx = this;
  let start = new Date().valueOf()
  ctx.body = "start: " + start + " "
  try {
    yield next;
  } catch (err) {
    console.log("index: ", " ",err)
  }
  ctx.body += " delay: " + (new Date().valueOf() - start) + " "
});

let userRoutes = require('./routes/user');

app.use(userRoutes);

let port = process.env.port || config.port || 8282;
console.log("App is listenning on port: " + port);
app.listen(port);