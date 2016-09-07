"use strict";

let postgres = require('pg');
let pg       = require('co-pg')(postgres);
let config = require("../config.json");

var QueryError = function (errorCode, detail, query) {
  this.name = "QueryError"
  this.message = detail || "Error processing database query"
  this.query = query
  this.stack = (new Error()).stack
}

module.exports = {
  "query" : function* (queryString) {
    var timestamp, connectionResults, client, done, result

    if (config.debug) {
      timestamp = Date.now()
      console.log("db.query called: ", queryString)
    }

    connectionResults = yield pg.connectPromise(config.local)
    client = connectionResults[0]
    done = connectionResults[1]

    try {
      result = yield client.queryPromise(queryString);
    } catch (e) {
      console.error(e)
      throw new QueryError(e.code, e.detail, queryString)
    }

    done();

    if (config.debug) {
      console.log(`elapsed: ${ Date.now() - timestamp }`)
    }

    return result
  }
}
