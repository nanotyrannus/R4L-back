'use strict';

let koa      = require('koa');

let config   = require('./config');
let bodyParser = require('koa-bodyparser');
let services = require('./services');
let co = require('co');
let send = require("koa-send");

let front = process.env.R4L_FRONT || "/home/ubuntu/radarforlife/front/"

// koa app
let app = koa();

app.use(bodyParser());

co.wrap(function* () {
  try {
    yield services.init();
  } catch(e) {
    console.error(e);
  }
  try {
    //inject postgres client as middleware
    app.use(function *(next) {
      let ctx = this;
      let start = new Date().valueOf()

      if (ctx.path === "/") {
        console.log("Index requested:", front + "public/index.html");
        yield send(ctx, front + "public/index.html", {"root" : "/"});
      } else {
        //Default value for root is not root, but the location of source code file.
        console.log(front + "public/" + ctx.path)
        yield send(ctx, "public/" + ctx.path, {"root": front});
      }

      yield next;
    });

    let userRoutes = require('./routes/user');

    app.use(userRoutes);
    let port = config.port || process.env.port || 8282;
    app.listen(port)
    console.log("App is listenning on port: " + port);
  } catch (e) {
    console.log(e)
  }
})();
