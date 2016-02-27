"use strict"

var koa = require("koa")
var config = require("./config")
var send = require("send")

var front = process.env.R4L_FRONT || "/home/ubuntu/radarforlife/front/"

var app = koa()

app.use(function* () {
  var ctx = this
  if (ctx.path === "/") {
    console.log("Index requested:", front + "public/index.html");
    yield send(ctx, front + "public/index.html", {"root" : "/"});
  } else {
    //Default value for root is not root, but the location of source code file.
    console.log(front + "public" + ctx.path)
    yield send(ctx, "public" + ctx.path, {"root": front});
  }
})
