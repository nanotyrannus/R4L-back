"use strict"

let db    = require("./shared/db.js")
let util  = require("util")
let co    = require("co")
var jwt   = require("koa-jwt")
var fs    = require("fs")

var home = process.env.HOME
var publicKey = fs.readFileSync(home + "/.ssh/radar.rsa.pub")
var privateKey = fs.readFileSync(home + "/.ssh/radar.rsa")

module.exports = {
  /**
  * @userIdentifier can be either an email or username
  */
  "isAdmin" : function* (userIdentifier) {
    var queryString = util.format(`SELECT COUNT(*) > 0 AS is_admin
                                   FROM admins AS a
                                   INNER JOIN users AS b
                                   ON a.username=b.username
                                   WHERE b.username='%s' OR b.email='%s'`, userIdentifier, userIdentifier)

    var queryResult = yield db.query(queryString)
    return queryResult.rows[0].is_admin
  },
  "getEventTotals" : function* (eventId) {
    var queryString = util.format(`select id, status, count(status)
    from _%s_states
    group by id, status`, eventId)

    try {
      var status = 200
      var message = null
      var result = yield db.query(queryString)
      var processed = result.rows.reduce(function (previous, current) {
        if (previous.result[current.id]) {
          let accumulator = previous.result[current.id]
          accumulator[current.status] = Number(current.count)
          if ((Number(accumulator[accumulator["highest"]]) || 0) < Number(current.count)) {
            accumulator["highest"] = current.status
          } else if (Number(accumulator[accumulator["highest"]]) === Number(current.count)) {
            /**
            * Number returns NaN on undefined, so the above OR casts NaN to 0
            */
            accumulator["highest"] = "TIE"
          }
        } else {
          let o = {
            "id" : current.id,
            "DAMAGE" : 0,
            "NO_DAMAGE" : 0,
            "UNSURE" : 0,
            "NOT_EVALUATED" : 0
          }
          o[current.status] = current.count
          o["highest"] = current.status
          previous.result[current.id] = o
        }
        return previous
      }, {
        "result" : {}
      })
    } catch (e) {
      status = 401
      message = e
    }

    return {
      "status" : status,
      "message" : message,
      "result" : processed.result
    }
  },
  //select a.id, ST_AsGeoJSON(geom) AS geometry, properties, b.color from sites as a full outer join ryan_100_colors as b on a.id=b.id;

  /**
  *  Get polygons of specific user along with status
  */
  "getUserPolygons" : function* (username, eventId) {
    var tableName = util.format("%s_%s_states", username, eventId);
    var queryString = util.format(`CREATE TABLE IF NOT EXISTS %s(
      id          integer           not null unique
    ) INHERITS (_%s_states)` , tableName, eventId)

    yield db.query(queryString)

    queryString = util.format(`
      SELECT a.id, ST_AsGeoJSON(geom_poly) AS geometry, ST_AsGeoJSON(geom_multi) AS geometry_multi, (properties || jsonb_build_object('status',
      (
        SELECT
        CASE WHEN b.status IS NULL THEN 'NOT_EVALUATED'
        ELSE b.status
        END
      )
    )) AS properties, 'Feature' AS type
    FROM _%s_sites AS a
    FULL OUTER JOIN %s AS b ON a.id=b.id`, eventId, tableName);
    try {
      var result = yield db.query(queryString);
      var status = 200
      var message = null
    } catch (e) {
      status = 401
      message = e
    }

    /**
    * Calculate optimal starting point for this user
    */

    queryString = util.format(`SELECT ST_AsGeoJSON( ST_Centroid( geom_poly  ) ) AS initial_centroid, ST_AsGeoJSON( ST_Centroid( geom_multi  ) ) AS initial_centroid_multi
    FROM _%s_sites
    WHERE id=1`, eventId)

    result.result = yield db.query(queryString)
    console.log(result)

    return {
      "status" : status,
      "message" : message,
      "features" : result.rows,
      "initial_centroid" : result.result.rows[0].initial_centroid || result.result.rows[0].initial_centroid_multi,
      "type" : "FeatureCollection"
    };
  },

  /**
  * Get user polygons in bounded area
  */

  "getUserPolygonsInArea" : function* (eventId, lat, lng) {

  },
  "authenticateUser" : function* (username, password) {
    var queryString = util.format("SELECT id, hash = crypt('%s', salt) AS is_match from users where username='%s' OR email='%s'", password, username, username)
    try {
      var result = yield db.query(queryString)
      queryString = util.format(`select count(*) > 0 as is_admin from admins where username='%s'`, username)
      var isAdmin = yield db.query(queryString)
      var message = null
      var status = 200
    } catch (e) {
      message = e
      status = 401
    }
    if (result.rowCount > 0) {
      var success = result.rows[0].is_match
      if (success) {
        var userId = result.rows[0].id
      } else {
        userId = null
        message = "Unable to authenticate with supplied credentials."
      }
      return {
        "status" : status,
        "message" : message,
        "success" : success,
        "user_id" : userId,
        "username" : username,
        "token" : jwt.sign({"username" : username}, privateKey, {"algorithm" : "RS256"}),
        "is_admin" : isAdmin.rows[0].is_admin
      }
    } else {
      return {
        "sucess" : false,
        "user_id" : null,
        "message" : "Username not recognized."
      }
    }
  },

  "addEvent" : function* (eventName, description, imageUrl) {
    var queryString = util.format(`INSERT INTO events (name, description, thumbnail, creation_date)
    VALUES ('%s', '%s', '%s', NOW())
    RETURNING id`, eventName, description, imageUrl);
    var result
    try {
      result = yield db.query(queryString)
      console.log(result)
      queryString = util.format(`CREATE TABLE _%s_states(
        date        timestamp         not null,
        status      text              not null references states(status) DEFAULT 'NOT_EVALUATED',
        id          integer           not null unique)`, result.rows[0].id)
        yield db.query(queryString)

        queryString = util.format(`CREATE TABLE _%s_sites() INHERITS (sites)`, result.rows[0].id)
        yield db.query(queryString)

      } catch (e) {
        return {
          "status" : 401,
          "success" : false,
          "message" : e,
        }
      }
      return {
        "status" : 200,
        "success" : true,
        "event_id" : result.rows[0].id,
        "event_name" : eventName
      }
    },
    "deleteEvent" : function* (eventId) {
      var queryString = util.format(`DELETE FROM events WHERE id=%s`, eventId)
      try {
        var result = yield db.query(queryString)
      } catch (e) {
        return {
          "status" : 401,
          "success" : false,
          "message" : e
        }
      }
      return {
        "status" : 200,
        "success" : (result.rowCount > 0) ? true : false
      }
    },
    "addPolygons" : function* (featCol, eventId) {
      //yielding an array of promises does not guarantee sequential evaluation
      //check if feature-collection is of polygons or multi-polygons
      var isMulti = false
      if (featCol.features[0] && featCol.features[0].geometry.type == "MultiPolygon") {
        isMulti = true
      }
      var result = yield featCol.features.map(function (feat) {
        feat.geometry["crs"] = {
          "type" : "name",
          "properties" : {
            "name" : "EPSG:4326"
          }
        };
        let queryString = util.format(`
          INSERT INTO _%s_sites (id, pos, %s, properties, event_id)
          VALUES (%s, %s, ST_GeomFromGeoJSON('%s'), '%s', %s)`,
          eventId,
          (isMulti) ? "geom_multi" : "geom_poly",
          feat.id,
          feat.properties.name,
          JSON.stringify(feat.geometry),
          JSON.stringify(feat.properties),
          eventId);
          return db.query(queryString.replace(/\n/,""));
        });

        var queryString = util.format(`SELECT ST_AsGeoJSON(ST_Centroid(ST_Union(%s))) AS geometry
        FROM sites
        WHERE event_id=%s`, (isMulti) ? "geom_multi" : "geom_poly",eventId)
        var centroidResult = yield db.query(queryString)
        var centroid = JSON.parse(centroidResult.rows[0].geometry)
        //    centroidResult.rows[0].geometry.crs = {"type":"name","properties":{"name":"EPSG:4326"}}
        console.log(centroid.coordinates)

        queryString = util.format(`UPDATE events
          SET centroid=ST_GeomFromText('POINT(%s %s)', 4326)
          WHERE id=%s`, centroid.coordinates[1], centroid.coordinates[0], eventId)
          yield db.query(queryString)

          var thumbnail = "https://maps.googleapis.com/maps/api/staticmap?center=" + centroid.coordinates[1] + "," + centroid.coordinates[0] + "&zoom=7&size=500x500&key=AIzaSyBVZTV9TU1NpITTB1ar5awvfr1BR1OKvlA"

          queryString = util.format(`UPDATE events SET site_count=%s, thumbnail='%s' WHERE id=%s`, featCol.features.length, thumbnail, eventId)
          yield db.query(queryString)

          return result;
        },

        //postgres returns JSONB as \" delimited strings. client must parse.
        "getEventPolygons" : function* (eventId) {
          let queryString = util.format(`
            SELECT id, ST_AsGeoJSON(geom_poly) AS geometry, ST_AsGeoJSON(geom_multi) AS geometry_multi, properties, 'Feature' AS type
            FROM sites WHERE event_id = %s`, eventId)
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
            let queryString = "SELECT id, site_count, name, description, thumbnail, creation_date, ST_AsGeoJSON(centroid) AS centroid FROM events";
            let result = yield db.query(queryString);
            return result.rows;
          },

          "createUser" : function* (username, password, email, firstName, lastName, salt) {
            let queryString = util.format(`INSERT INTO users (username, email, first_name, last_name, hash, salt)
            values ('%s', '%s', '%s', '%s', crypt('%s', '%s'), '%s')
            RETURNING id`, username, email, firstName, lastName, password, salt, salt);
            try {
              var result = yield db.query(queryString);
              var userId = result.rows[0].id
              var message = null
              var status = 200
              var success = true
              var token = jwt.sign({"username" : username}, privateKey, {"algorithm" : "RS256"})
            } catch (e) {
              userId = null
              message = e
              status = 401
              success = false
              token = null
            }
            return {
              "status" : status,
              "message" : message,
              "user_id" : userId,
              "username" : username,
              "success" : success,
              "token" : token
            };
          },

          "setPolygonColor" : function* (username, status, eventId, polygonId) {
            let tableName = util.format("%s_%s_states", username, eventId)
            let queryString = util.format(`CREATE TABLE IF NOT EXISTS %s (
              id          integer           not null unique
            ) INHERITS (_%s_states)`, tableName, eventId)

            try {
              yield db.query(queryString)
              queryString = util.format(`
                INSERT INTO %s (date, status, id)
                VALUES (NOW(), '%s', %s)
                ON CONFLICT ON CONSTRAINT %s_%s_states_id_key
                DO UPDATE SET status=excluded.status, date=NOW()
                RETURNING *`, tableName, status, polygonId, username, eventId)

                var result = yield db.query(queryString)
                var status = 200
                var message = null
                var success = true
              } catch (e) {
                status = 401
                message = e
                success = false
              }

              return {
                "status" : status,
                "message" : message,
                "success" : success
              }
            },

            "generateSalt" : function* () {
              let queryString = "SELECT gen_salt('md5') AS salt";
              let result = yield db.query(queryString);
              return result.rows[0].salt
            },

            "init" : function* () { //initialize tables if not exist
              yield db.query(`CREATE TABLE IF NOT EXISTS states (
                status      text                    not null unique
              )`)

              yield db.query(`INSERT INTO states VALUES ('DAMAGE'),('NO_DAMAGE'),('UNSURE'),('NOT_EVALUATED') ON CONFLICT DO NOTHING`)

              yield db.query(`CREATE TABLE IF NOT EXISTS users (
                id            serial primary key            not null unique,
                username      text                          not null unique,
                email         text                          not null unique,
                first_name    text                          not null,
                last_name     text                          not null,
                hash          text                          not null,
                salt          text                          not null
              )`)

              yield db.query(`CREATE TABLE IF NOT EXISTS admins (
                username      text                          references users(username)
              )`)

              yield db.query(`CREATE TABLE IF NOT EXISTS events (
                id            serial                        not null unique,
                name          text                          not null unique,
                description   text,
                thumbnail     text,
                creation_date date,
                centroid      geometry(Point, 4326),
                site_count    integer
              )`)

              yield db.query(`CREATE TABLE IF NOT EXISTS sites (
                id            integer                       not null,
                pos           integer                       not null,
                geom_poly     geometry(Polygon, 4326),
                geom_multi    geometry(MultiPolygon, 4326),
                properties    JSONB,
                event_id      integer                       references events(id)
              )`)

              yield db.query(`INSERT INTO events VALUES (100, 'Test') ON CONFLICT DO NOTHING`)

              console.log("Initialization done.")
              return
            }
          }
