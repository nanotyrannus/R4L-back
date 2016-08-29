"use strict"

const db = require("./shared/db.js")
const util = require("util")
const co = require("co")
const jwt = require("koa-jwt")
const fs = require("fs")

var home = process.env.HOME
var publicKey = fs.readFileSync(home + "/.ssh/radar.rsa.pub")
var privateKey = fs.readFileSync(home + "/.ssh/radar.rsa")


exports.isAdmin = function* isAdmin(userIdentifier) {
    var queryString = util.format(`
    SELECT COUNT(*) > 0 AS is_admin
    FROM admins AS a
    INNER JOIN users AS b
    ON a.username=b.username
    WHERE b.username='${ userIdentifier }' OR b.email='${ userIdentifier }'`)

    var queryResult = yield db.query(queryString)
    return queryResult.rows[0].is_admin
}

exports.getEventTotals = function* getEventTotals(eventId) {
    var queryString = `
    SELECT id, status, count(status) AS integer_count, SUM(weight) AS count 
    FROM _${ eventId }_states 
    GROUP BY id, status`

    try {
        var status = 200
        var message = null
        var result = yield db.query(queryString)
        var processed = result.rows.reduce(function reducer(previous, current) {
            if (previous.result[current.id]) {
                let accumulator = previous.result[current.id]
                accumulator[current.status] = Number(current.count)
                if ((Number(accumulator[accumulator["highest"]]) || 0) < Number(current.count)) {
                    // Number returns NaN on undefined, so the above OR casts NaN to 0
                    accumulator["highest"] = current.status
                } else if (Number(accumulator[accumulator["highest"]]) === Number(current.count)) {
                    accumulator["highest"] = "TIE"
                }
            } else {
                let o = {
                    "id": current.id,
                    "DAMAGE": 0,
                    "NO_DAMAGE": 0,
                    "UNSURE": 0,
                    "NOT_EVALUATED": 0
                }
                o[current.status] = current.count
                o["highest"] = current.status
                previous.result[current.id] = o
            }
            return previous
        }, { "result": {} })
    } catch (e) {
        status = 401
        message = e
    }

    return {
        "status": status,
        "message": message,
        "result": processed.result
    }
}

// Get polygons with user status
exports.getUserPolygons = function* getUserPolygons(username, eventId) {
    var tableName = util.format("%s_%s_states", username, eventId);
    var queryString = `
    CREATE TABLE IF NOT EXISTS ${ tableName }(
    id          integer           not null unique
    ) INHERITS (_${ eventId }_states)`

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
    //TODO
    queryString = `SELECT `

    /**
     * Calculate optimal starting point for this user
     */
    queryString = `
    SELECT ST_AsGeoJSON( ST_Centroid( geom_poly  ) ) AS initial_centroid,
    A.id, COALESCE(SUM(B.weight), 0) AS weight
    FROM _${ eventId }_sites AS A
    FULL OUTER JOIN _${ eventId }_states AS B
    ON A.id=B.id
    GROUP BY B.id, A.id, a.geom_poly
    ORDER BY A.id`
    
    result.result = yield db.query(queryString)
    var centroids = result.result.rows
    var maxWeight = 0
    centroids.forEach(function onEach(element) {
        if (element.weight > maxWeight) {
            maxWeight = element.weight
        }
    })
    // totalWeight is the sum of all weights inverted
    var totalWeight = centroids.reduce(function reducer(accumulator, current) {
        return accumulator + (maxWeight - Number(current.weight))
    }, 0)
    var random = Math.random() * totalWeight

    let randomIndex = Math.floor(centroids.length*Math.random())
    let threshold = 0
    for (var i = 0; i < centroids.length; ++i) {
        threshold += (maxWeight - Number(centroids[i].weight))
        if (threshold >= random) {
            randomIndex = i
            break
        }
    } 

    let centroidTable = yield db.query(`
    SELECT id, properties->'centroid' AS centroid
    FROM _${ eventId }_sites`)
    console.log(`Centroid Table: `, centroidTable.rows)
    
    return {
        "status": status,
        "message": message,
        "features": [], //result.rows,
        "centroid_table" : centroidTable.rows,
        "initial_centroid": result.result.rows[randomIndex].initial_centroid || result.result.rows[randomIndex].initial_centroid_multi,
        "type": "FeatureCollection"
    }
}

exports.getUserPolygonsInArea = function* getUserPolygonsInArea(username, eventId, idList) {
    var tableName = `${ username }_${ eventId }_states`
    var queryString = `CREATE TABLE IF NOT EXISTS ${ tableName } (
    id integer not null unique
    ) INHERITS (_${ eventId }_states)`

    yield db.query(queryString)

    queryString = `SELECT a.id, ST_AsGeoJSON(geom_poly) AS geometry, ST_AsGeoJSON(geom_multi) AS geometry_multi, (properties || jsonb_build_object('status',
    ( 
      SELECT
      CASE WHEN b.status IS NULL THEN 'NOT_EVALUATED'
      ELSE b.status
      END
    )
    )) AS properties, 'Feature' AS type
    FROM _${ eventId }_sites AS a
    FULL OUTER JOIN ${ tableName } AS b ON a.id=b.id`
    if (idList) {
        queryString += ` WHERE a.id IN (${ idList })`
    }
    var result = yield db.query(queryString)
    return result
}

exports.getUserPolygonIdsInArea = function* getUserPolygonIdsInArea(username, eventId, bounds) {
    var queryString = `
  SELECT id FROM _${eventId}_sites
  WHERE geom_poly &&
  ST_Transform(ST_MakeEnvelope(${bounds.minLng}, ${bounds.minLat}, ${bounds.maxLng}, ${bounds.maxLat}, 4326), 4326)`
    var result = yield db.query(queryString)
    console.log(`from services.getUserPolygonsInArea ~~~`)
    return result.rows
}

exports.authenticateUser = function* authenticateUser(username, password) {
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
            "status": status,
            "message": message,
            "success": success,
            "user_id": userId,
            "username": username,
            "token": jwt.sign({
                "username": username
            }, privateKey, {
                    "algorithm": "RS256"
                }),
            "is_admin": isAdmin.rows[0].is_admin
        }
    } else {
        return {
            "sucess": false,
            "user_id": null,
            "message": "Username not recognized."
        }
    }
}

exports.addEvent = function* addEvent(eventName, description, imageUrl) {
    var queryString = `
    INSERT INTO events (name, description, thumbnail, creation_date)
    VALUES ('${ eventName }', '${ description }', '${ imageUrl }', NOW())
    RETURNING id`
    var result
    try {
        result = yield db.query(queryString)
        console.log(result)
        queryString = util.format(`
      CREATE TABLE _%s_states(
        date        timestamp         not null,
        status      text              not null references states(status) DEFAULT 'NOT_EVALUATED',
        id          integer           not null unique,
        weight      numeric(10, 5)    DEFAULT 0.0)`, result.rows[0].id)
        yield db.query(queryString)

        queryString = util.format(`CREATE TABLE _%s_sites() INHERITS (sites)`, result.rows[0].id)
        yield db.query(queryString)

    } catch (e) {
        return {
            "status": 401,
            "success": false,
            "message": e,
        }
    }
    return {
        "status": 200,
        "success": true,
        "event_id": result.rows[0].id,
        "event_name": eventName
    }
}

exports.deleteEvent = function* deleteEvent(eventId) {
    var queryString = `DELETE FROM events WHERE id=${ eventId }`
    try {
        var result = yield db.query(queryString)
    } catch (e) {
        return {
            "status": 401,
            "success": false,
            "message": e
        }
    }
    return {
        "status": 200,
        "success": (result.rowCount > 0) ? true : false
    }
}

exports.addPolygons = function* addPolygons(featCol, eventId) {
    // Yielding an array of promises does not guarantee sequential evaluation
    // check if feature-collection is of polygons or multi-polygons
    var isMulti = false
    if (featCol.features[0] && featCol.features[0].geometry.type == "MultiPolygon") {
        isMulti = true
    }
    var result = yield featCol.features.map(function (feat) {
        feat.geometry["crs"] = {
            "type": "name",
            "properties": {
                "name": "EPSG:4326"
            }
        }
        let queryString = util.format(`
          INSERT INTO _%s_sites (id, pos, %s, properties, event_id)
          VALUES (%s, %s, ST_GeomFromGeoJSON('%s'), '%s', %s)`,
            eventId,
            (isMulti) ? "geom_multi" : "geom_poly",
            feat.id,
            feat.properties.name,
            JSON.stringify(feat.geometry),
            JSON.stringify(feat.properties),
            eventId)
        return db.query(queryString.replace(/\n/, ""))
    })

    var queryString = util.format(`SELECT ST_AsGeoJSON(ST_Centroid(ST_Union(%s))) AS geometry FROM sites WHERE event_id=%s`, (isMulti) ? "geom_multi" : "geom_poly", eventId)
    var centroidResult = yield db.query(queryString)
    var centroid = JSON.parse(centroidResult.rows[0].geometry)
    //    centroidResult.rows[0].geometry.crs = {"type":"name","properties":{"name":"EPSG:4326"}}
    console.log(centroid.coordinates)

    queryString = util.format(`UPDATE events SET centroid=ST_GeomFromText('POINT(%s %s)', 4326) WHERE id=%s`, centroid.coordinates[1], centroid.coordinates[0], eventId)
    yield db.query(queryString)

    var thumbnail = "https://maps.googleapis.com/maps/api/staticmap?center=" + centroid.coordinates[1] + "," + centroid.coordinates[0] + "&zoom=7&size=500x500&key=AIzaSyBVZTV9TU1NpITTB1ar5awvfr1BR1OKvlA"

    queryString = util.format(`UPDATE events SET site_count=%s, thumbnail='%s' WHERE id=%s`, featCol.features.length, thumbnail, eventId)
    yield db.query(queryString)

    return result;
}

exports.getInitialPolygon = function* getInitialPolygon(username, eventId) {
    var queryString = `SELECT `
}

// Postgres returns JSONB as \" delimited strings. client must parse.
exports.getEventPolygons = function* getEventPolygons(eventId) {
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
        "status": status,
        "message": message,
        "features": result.rows,
        "type": "FeatureCollection"
    }
}

exports.getEvents = function* getEvents() {
    let queryString = `SELECT id, site_count, name, description, thumbnail, creation_date, ST_AsGeoJSON(centroid) AS centroid FROM events`;
    let result = yield db.query(queryString);
    return result.rows;
}

exports.getEventsPage = function* getEventsPage(page) {
    var queryString = util.format(`SELECT id, site_count, name, description, thumbnail, creation_date, ST_AsGeoJSON(centroid) AS centroid
        LIMIT 10 OFFSET %s`, page * 10)
    var result = yield db.query(queryString)
    return {
        "result": result.rows,
        "page": page
    }
}

exports.createUser = function* createUser(username, password, email, firstName, lastName, salt) {
    let queryString = util.format(`
          INSERT INTO users (username, email, first_name, last_name, hash, salt)
          values ('%s', '%s', '%s', '%s', crypt('%s', '%s'), '%s')
          RETURNING id`, username, email, firstName, lastName, password, salt, salt)
    try {
        var result = yield db.query(queryString);
        var userId = result.rows[0].id
        var message = null
        var status = 200
        var success = true
        var token = jwt.sign({
            "username": username
        }, privateKey, {
                "algorithm": "RS256"
            })
    } catch (e) {
        userId = null
        message = e
        status = 401
        success = false
        token = null
    }
    return {
        "status": status,
        "message": message,
        "user_id": userId,
        "username": username,
        "success": success,
        "token": token
    };
}

exports.setPolygonColor = function* setPolygonColor(username, status, eventId, polygonId) {
    let tableName = util.format("%s_%s_states", username, eventId)
    let queryString = util.format(`CREATE TABLE IF NOT EXISTS %s () INHERITS (_%s_states)`, tableName, eventId)

    try {
        yield db.query(queryString)
        queryString = util.format(`
              SELECT weight
              FROM users
              WHERE username='%s' OR email='%s'`, username, username)
        let weight = yield db.query(queryString)
        console.log("weight", weight.rows[0].weight)
        queryString = util.format(`
                INSERT INTO %s (date, status, id, weight)
                VALUES (NOW(), '%s', %s, %s)
                ON CONFLICT ON CONSTRAINT %s_%s_states_id_key
                DO UPDATE SET status=excluded.status, date=NOW()
                RETURNING *`, tableName, status, polygonId, weight.rows[0].weight, username, eventId)

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
        "status": status,
        "message": message,
        "success": success
    }
}

exports.generateSalt = function* generateSalt() {
    let queryString = "SELECT gen_salt('md5') AS salt";
    let result = yield db.query(queryString);
    return result.rows[0].salt
}

exports.init = function* init() { //initialize tables if not exist
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
                salt          text                          not null,
                weight        numeric(10, 5)                not null DEFAULT 1.00
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

    console.log("Initialization done.")
    return
}

module.exports = exports
