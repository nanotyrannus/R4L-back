"use strict"

let db = require("./shared/db.js");
let util = require("util");

module.exports = {

  "getUserPolygonColors" : function* (user) {

  },

  "authenticateUser" : function* (username, password) {
    let queryString = util.format("SELECT hash = crypt('%s', salt) AS is_match from users where username='%s'", password, username);
    let result = yield db.query(queryString);
    if (result.rowCount > 0) {
      return result.rows[0].is_match
    } else {
      return false
    }
  },

  "addEvent" : function* (eventName) {
    let queryString = util.format("INSERT INTO events (name) VALUES (%s)", eventName);
    let result = yield db.query(queryString);
    return result
  },
  /**
  @param {array} polygons array of one or more polygons to add to the database
  */
  "addPolygons" : function* (featCol, eventId) {

  },

  "createUser" : function* (username, password, salt) {
    let queryString = util.format("INSERT INTO users (username, hash, salt) values ('%s', crypt('%s', '%s'), '%s')", username, password, salt, salt);
    let result = yield db.query(queryString);
    return result
  },

  "setPolygonColor" : function* (username, color, eventId, polygonId) {
    console.log(username, color, eventId, polygonId)
  },

  "generateSalt" : function* () {
    let queryString = "SELECT gen_salt('md5') AS salt";
    let result = yield db.query(queryString);
    return result.rows[0].salt;
  }
}
