"use strict";

let db = require("./shared/db.js");
let util = require("util");
let co = require("co");

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
    let queryString = util.format("INSERT INTO events (name) VALUES ('%s')", eventName);
    let result = yield db.query(queryString);
    return result;
  },
  /**
  @param {array} polygons array of one or more polygons to add to the database
  */
  "addPolygons" : function* (featCol, eventId) {
    // featCol.features.forEach(co.wrap(function* (feat) {
    //   feat["crs"] = {
    //     "type" : "name",
    //     "properties" : {
    //       "name" : "EPSG:3857"
    //     }
    //   };
    //   let queryString = util.format("INSERT INTO sites (id, pos, geom, event_id) VALUES (%s, %s, '%s', %s)", feat.id, feat.properties.name, JSON.stringify(feat.geometry), eventId);
    //   let result = yield db.query(queryString);
    //   console.log("sent!");
    // }));
    //yielding an array of promises does not guarantee sequential evaluation
    try {
    var result = yield featCol.features.map(function (feat) {
        feat.geometry["crs"] = {
          "type" : "name",
          "properties" : {
            "name" : "EPSG:4326"
          }
        };
        let queryString = util.format("INSERT INTO sites (id, pos, geom, event_id) VALUES (%s, %s, ST_GeomFromGeoJSON('%s'), %s)", feat.id, feat.properties.name, JSON.stringify(feat.geometry), eventId);
        return db.query(queryString);
    });
  } catch (e) {
    console.error(e);
  }
    return result;
  },

  "getPolygons" : function* (eventId) {

  },

  "getEvents" : function* (){
    let queryString = "SELECT * FROM events";
    let result = yield db.query(queryString);
    return result.rows;
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
