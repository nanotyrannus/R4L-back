"use strict";

let sql = require("sql");
let db = require("../shared/db.js");
let pg = require("pg");
let config = require("../config.json");

let user_id = "3004";
let event_id = "5";

pg.connect(config.postgres, function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  client.query("CREATE TABLE " + "Colors_" + user_id + "_" + event_id + "(COLOR CHAR[50] NOT NULL, POLYGON INTEGER NOT NULL)", function(err, result) {
    //call `done()` to release the client back to the pool
    done();

    if(err) {
      return console.error('error running query', err);
    }
    console.log(result);
    //output: 1
  });
});
