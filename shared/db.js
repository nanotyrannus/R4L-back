"use strict";

let postgres = require('pg');
let pg       = require('co-pg')(postgres);
let config = require("../config.json");

module.exports = {
  "query" : function* (queryString) {
    console.log("db.query called! ", queryString);
    let connectionResults = yield pg.connectPromise(config.postgis_mac)
    let client = connectionResults[0]
    let done = connectionResults[1]

    let result = yield client.queryPromise(queryString);
    done();
    console.log("done");
    return result
  }
}
