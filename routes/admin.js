"use strict"

var Router    = require('koa-router')
var db        = require("../shared/db.js")
var services  = require("../services.js")
var fs        = require("fs")

var router = new Router()

router
  .get("/admin", function* (){
    var ctx = this
    this.body = "You're an admin!"
  })

module.exports.routes = router.routes()
