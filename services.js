"use strict";

let db = require("./shared/db.js");
let util = require("util");
let co = require("co");

module.exports = {

  "getUserPolygonColors" : function* (username, eventId) {
    let queryString = util.format("CREATE TABLE IF NOT EXISTS %s_%s_colors (%s)", username, eventId, "date timestamp not null, color text not null references colors(color), id integer not null unique");
    yield db.query(queryString);

    queryString = util.format("SELECT * FROM %s_%s_colors", username, eventId);
    let result = yield db.query(queryString);

    return result.rows;
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
    var result = yield featCol.features.map(function (feat) {
      feat.geometry["crs"] = {
        "type" : "name",
        "properties" : {
          "name" : "EPSG:4326"
        }
      };
      let queryString = util.format("INSERT INTO sites (id, pos, geom, properties, event_id) VALUES (%s, %s, ST_GeomFromGeoJSON('%s'), '%s', %s)",
      feat.id, feat.properties.name,
      JSON.stringify(feat.geometry),
      JSON.stringify(feat.properties),
      eventId);
      return db.query(queryString);
    });

    return result;
  },

  //postgres returns JSONB as \" delimited strings. client must parse.
  "getPolygons" : function* (eventId) {
    let queryString = util.format("SELECT id, ST_AsGeoJSON(geom) AS geom, properties FROM sites WHERE event_id = %s", eventId);
    let result = yield db.query(queryString);
    return result.rows;
  },

  "getEvents" : function* () {
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
    let queryString = util.format("CREATE TABLE IF NOT EXISTS %s_%s_colors (%s)",
    username, eventId, "date timestamp not null, color text not null references colors(color), id integer not null unique");
    yield db.query(queryString);

    queryString = util.format("SELECT username FROM users WHERE id='%s'", username);


    queryString = util.format("INSERT INTO %s_%s_colors VALUES (NOW(), '%s', %s)", username, eventId, color, polygonId);
    let result = yield db.query(queryString);

    return result;
  },

  "generateSalt" : function* () {
    let queryString = "SELECT gen_salt('md5') AS salt";
    let result = yield db.query(queryString);
    return result.rows[0].salt;
  },

  "confirmSession" : function* () {

  },

  "init" : function* () { //initialize tables if not exist
    yield db.query(`CREATE TABLE IF NOT EXISTS colors (
      color       text                    not null unique
    )`);

    yield db.query(`INSERT INTO colors VALUES ('blue'),('red'),('purple'),('none') ON CONFLICT DO NOTHING`);

    yield db.query(`CREATE TABLE IF NOT EXISTS users (
      id          serial primary key      not null unique,
      username    text                    not null unique,
      hash        text                    not null,
      salt        text                    not null
    )`);

    yield db.query(`CREATE TABLE IF NOT EXISTS events (
      id          serial                  not null unique,
      name        text                    not null
    )`);

    yield db.query(`CREATE TABLE IF NOT EXISTS sites (
      id          integer                 not null unique,
      pos         integer                 not null unique,
      geom        geometry(Polygon, 4326) not null,
      properties  JSONB,
      event_id    integer                 references events(id)
    )`);

    console.log("Initialization done.")
  }
}
