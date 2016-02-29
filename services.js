"use strict";

let db    = require("./shared/db.js")
let util  = require("util")
let co    = require("co")

module.exports = {
  //select a.id, ST_AsGeoJSON(geom) AS geometry, properties, b.color from sites as a full outer join ryan_100_colors as b on a.id=b.id;
  "getUserPolygons" : function* (username, eventId) {
    let tableName = util.format("%s_%s_colors", username, eventId);
    let queryString = util.format(`CREATE TABLE IF NOT EXISTS %s (
      date timestamp not null,
      color text not null references colors(color),
      id integer not null unique)`, tableName);
    yield db.query(queryString);

    queryString = util.format(`
      SELECT a.id, ST_AsGeoJSON(geom) AS geometry, (properties || jsonb_build_object('color', b.color)) AS properties, 'Feature' AS type
      FROM sites AS a
      FULL OUTER JOIN %s AS b ON a.id=b.id`, tableName);
    try {
      var result = yield db.query(queryString);
      var status = 200
      var message = null
    } catch (e) {
      status = 401
      message = e
    }

    return {
      "status" : status,
      "message" : message,
      "features" : result.rows,
      "type" : "FeatureCollection"
    };
  },

  "authenticateUser" : function* (username, password) {
    var queryString = util.format("SELECT id, hash = crypt('%s', salt) AS is_match from users where username='%s'", password, username)
    var result = yield db.query(queryString)
    if (result.rowCount > 0) {
      var response = {
        "success" : result.rows[0].is_match
      };
      if (response.success) {
        response.user_id = result.rows[0].id
      } else {
        response.user_id = null
        response.message = "Unable to authenticate with supplied credentials."
      }
      return response;
    } else {
      return {
        "sucess" : false,
        "user_id" : null,
        "message" : "Username not recognized."
      }
    }
  },

  "addEvent" : function* (eventName) {
    let queryString = util.format("INSERT INTO events (name) VALUES ('%s')", eventName);
    let result = yield db.query(queryString);
    return result;
  },

  "addPolygons" : function* (featCol, eventId) {
    //yielding an array of promises does not guarantee sequential evaluation
    var result = yield featCol.features.map(function (feat) {
      feat.geometry["crs"] = {
        "type" : "name",
        "properties" : {
          "name" : "EPSG:4326"
        }
      };
      let queryString = util.format(`
        INSERT INTO sites (id, pos, geom, properties, event_id)
        VALUES (%s, %s, ST_GeomFromGeoJSON('%s'), '%s', %s)`,
      feat.id,
      feat.properties.name,
      JSON.stringify(feat.geometry),
      JSON.stringify(feat.properties),
      eventId);
      return db.query(queryString.replace(/\n/,""));
    });

    return result;
  },

  //postgres returns JSONB as \" delimited strings. client must parse.
  "getEventPolygons" : function* (eventId) {
    let queryString = util.format("SELECT id, ST_AsGeoJSON(geom) AS geometry, properties FROM sites WHERE event_id = %s", eventId);
    try {
      var result = yield db.query(queryString)
      var status = 200
      var message = null
    } catch (e) {
      status = 401
      message = e
    }

    return {
      "status" : status,
      "message" : message,
      "features" : result.rows,
      "type" : "FeatureCollection"
    }
  },

  "getEvents" : function* () {
    let queryString = "SELECT * FROM events";
    let result = yield db.query(queryString);
    return result.rows;
  },

  "createUser" : function* (username, password, salt) {
    let queryString = util.format("INSERT INTO users (username, hash, salt) values ('%s', crypt('%s', '%s'), '%s') RETURNING id", username, password, salt, salt);
    try {
      var result = yield db.query(queryString);
      var message = null
      var status = 200
      var success = true
    } catch (e) {
      message = e
      status = 401
      success = false
    }
    return {
      "status" : status,
      "message" : message,
      "user_id" : result.rows[0].id,
      "success" : success
    };
  },

  "setPolygonColor" : function* (username, color, eventId, polygonId) {
    let tableName = util.format("%s_%s_colors", username, eventId)
    let queryString = util.format(`CREATE TABLE IF NOT EXISTS %s (
      date        timestamp               not null,
      color       text                    not null references colors(color),
      id          integer                 not null unique
    )`, tableName)

    try {
      yield db.query(queryString)
      queryString = util.format(`
        INSERT INTO %s (date, color, id)
        VALUES (NOW(), '%s', %s)
        ON CONFLICT ON CONSTRAINT %s_%s_colors_id_key
        DO UPDATE SET color=excluded.color, date=NOW()
        RETURNING *`, tableName, color, polygonId, username, eventId)

      var result = yield db.query(queryString)
      var status = 200
      var message = null
    } catch (e) {
      status = 401
      message = e
    }

    return result
  },

  "generateSalt" : function* () {
    let queryString = "SELECT gen_salt('md5') AS salt";
    let result = yield db.query(queryString);
    return result.rows[0].salt
  },

  "confirmSession" : function* () {

  },

  "init" : function* () { //initialize tables if not exist
    yield db.query(`CREATE TABLE IF NOT EXISTS colors (
      color       text                    not null unique,
      status      text                    not null unique
    )`)

    yield db.query(`INSERT INTO colors VALUES ('blue', 'undamaged'),('red', 'damaged'),('purple', 'unknown'),('none', 'unranked') ON CONFLICT DO NOTHING`)

    yield db.query(`CREATE TABLE IF NOT EXISTS users (
      id          serial primary key      not null unique,
      username    text                    not null unique,
      hash        text                    not null,
      salt        text                    not null
    )`)

    yield db.query(`CREATE TABLE IF NOT EXISTS events (
      id          serial                  not null unique,
      name        text                    not null unique
    )`)

    yield db.query(`CREATE TABLE IF NOT EXISTS sites (
      id          integer                 not null unique,
      pos         integer                 not null unique,
      geom        geometry(Polygon, 4326) not null,
      properties  JSONB,
      event_id    integer                 references events(id)
    )`)

    yield db.query(`INSERT INTO events VALUES (100, 'Test') ON CONFLICT DO NOTHING`)

    console.log("Initialization done.")
    return
  }
}
