"use strict"

let db = require("./shared/db.js");
let sql = require("sql");

module.exports = {

  "getUserPolygonColors" : function* (user) {

  },

  "authenticateUser" : function* (username, password) {

  },

  "addEvent" : function* (eventId, eventName) {
    db.query("INSERT INTO events values (" + [eventId, "'" + eventName + "'"].join(",") +")");
  },
  /**
  @param {array} polygons array of one or more polygons to add to the database
  */
  "addPolygons" : function* (polygons, eventId) {

  },

  "createUser" : function* (username, password) {

  },

  "setPolygonColor" : function* (username, color, eventId, polygonId) {
    console.log(username, color, eventId, polygonId)
  }
}
