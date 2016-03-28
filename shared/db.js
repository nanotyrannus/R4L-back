"use strict";

let postgres = require('pg');
let pg       = require('co-pg')(postgres);
let config = require("../config.json");

var QueryError = function (errorCode, detail) {
  this.name = "QueryError"
  this.message = detail || "Error processing database query"
  this.stack = (new Error()).stack
}

module.exports = {
  "query" : function* (queryString) {
    var timestamp, connectionResults, client, done, result
    
    if (config.debug) {
      timestamp = new Date()
      console.log("db.query called: ", queryString, "\nTime:", timestamp)
    }
    
    connectionResults = yield pg.connectPromise(config.aws)
    client = connectionResults[0]
    done = connectionResults[1]
    
    try {
      result = yield client.queryPromise(queryString);
    } catch (e) {
      throw new QueryError(e.code, e.detail)
    }
    
    done();
    
    if (config.debug) {
      console.log("Done: " + timestamp)
    }
    
    return result
  }
}
