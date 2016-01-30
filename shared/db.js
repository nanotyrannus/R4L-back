"use strict";

let postgres = require('pg');
let pg       = require('co-pg')(postgres);
let config = require("../config.json");

module.exports = {
  "query" : function* (queryString) {
    let connectionResults = yield pg.connectPromise(config.postgres)
    let client = connectionResults[0]
    let done = connectionResults[1]

    let result = yield client.queryPromise(queryString)
    done()

    return result
  }
}
