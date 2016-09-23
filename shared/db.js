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
  "query" : function* (queryString, verbose=true) {
    var timestamp, connectionResults, client, done, result

    if (verbose) {
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

    if (verbose) {
      console.log(`elapsed: ${ Date.now() - timestamp }`)
    }

    return result
  },
  "Transaction" : function* () {
    var connectionResults = yield pg.connectPromise(config.local)
    var client = connectionResults[0]
    var done = connectionResults[1]

    return {
      "begin" : function* () {
        yield client.queryPromise('BEGIN')
      },
      "query" : function* (queryString, verbose=true) {
        var result = null
        try {
          result = yield client.queryPromise(queryString)
        } catch (e) {
          yield client.queryPromise(`ROLLBACK`)
          console.log(`Rolled back:\n${ queryString }`)
          throw e
        }
        if (verbose) {
          console.log(`TRANSACTION: `, result)
        }
        return result
      },
      "done" : function* () {
        yield client.queryPromise(`COMMIT`)
        done()
      }
    }
  }
}
