'use strict';

let koa      = require('koa');

let config   = require('./config');
let bodyParser = require('koa-bodyparser');
let services = require('./services');
let co = require('co');

// koa app
let app = koa();

app.use(bodyParser());

co.wrap(function* () {
  try {
    yield services.init();
  } catch(e) {
    console.error(e);
  }
    //inject postgres client as middleware
    app.use(function *(next) {
      let ctx = this;
      let start = new Date().valueOf()
      yield next;
    });

    let userRoutes = require('./routes/user');

    app.use(userRoutes);

    let port = config.portk || process.env.port || 8282;
    app.listen(port)
    console.log("App is listenning on port: " + port);
})();
