"use strict";

let postgres = require('pg');
let pg       = require('co-pg')(postgres);
let config = require("../config.json");

module.exports = {
  "query" : function* (queryString) {
    if (config.debug) {
      var timestamp = new Date();
      console.log("db.query called: ", queryString, "\nTime:", timestamp);
    }
    let connectionResults = yield pg.connectPromise(config.aws)
    let client = connectionResults[0]
    let done = connectionResults[1]

    let result = yield client.queryPromise(queryString);
    done();
    if (config.debug) {
      console.log("Done: " + timestamp)
    }
    return result
  }
}
