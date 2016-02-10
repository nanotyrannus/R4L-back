"use strict";

let sql = require("sql");
let db = require("../shared/db.js");
let pg = require("pg");
let config = require("../config.json");
let polygons = require("../polygons.json");

sql.setDialect("postgres");
var sites = sql.define({
  "name" : "sites",
  "columns" : ["polygon_id", "position", "properties", "geom"]
});

let start

function uploadPolygons(features) {
  start = new Date().valueOf()
  features.forEach(function (elm) {
    elm.geometry["crs"] = {"type":"name","properties":{"name":"EPSG:4326"}}
    query("INSERT INTO sites VALUES (" + [elm.id, elm.properties.name, "'" + JSON.stringify(elm.properties) + "'","st_geomfromgeojson('" + JSON.stringify(elm.geometry) + "')"].join(",") + ")")
  })
  query("DELETE FROM sites")
}


uploadPolygons(polygons.features);

function query(str) {
pg.connect(config.postgis, function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  let old = "INSERT INTO sites VALUES (ST_GeomFromGeoJSON('" + JSON.stringify(polygons.features[1]) + "'))"
  client.query(str, function(err, result) {
    //call `done()` to release the client back to the pool
    done();

    if(err) {
      return console.error('error running query', err);
    }
    console.log("time: " + (new Date().valueOf() - start));
    //output: 1
  });
});
}
