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
  .delete("/event/:id", function* () {
    var ctx = this
    var id = number(ctx.params.id)
    try {
    var transaction = yield db.Transaction()
    yield transaction.begin()
    yield transaction.query(`DROP TABLE _${ id }_sites, _${ id }_states`)
    var result = yield transaction.done()
    } catch (e) {
      console.error(e)
    }
    return result 
  })

module.exports.routes = router.routes()
