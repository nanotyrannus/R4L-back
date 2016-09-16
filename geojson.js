/**
* This is a utility for converting FeatureCollections into
* a form that is digestable by the app
*/

var fs = require('fs')
var argv = require('minimist')(process.argv.slice(2))

var fileName, outputName, o, maxPolygonCount, startCount
try {
  fileName = fs.readFileSync(process.argv[2])
  outputName = process.argv[3] || (fileName + ".out")
  maxPolygonCount = argv.max
  startCount = argv.start || 0
  console.log(`start: ${startCount} max: ${maxPolygonCount}`)
} catch (e) {
  console.error("Must supply input name.")
  process.exit(1)
}

o = JSON.parse(fileName.toString())
o.features[0].properties.Description = ""
// debugger;
var flattened = new Array()
o.features.forEach(function (feat) {
  var geom = feat.geometry;
  var props = feat.properties;
  if (geom.type === 'MultiPolygon') {
    for (var i = 0; i < geom.coordinates.length; i++) {
      var polygon = {
        'type': 'Polygon',
        'coordinates': geom.coordinates[i],
      };
      polygon.coordinates[i].forEach(function (elm) {
        elm.splice(2, 1)
      })
      var feature = {
        "properties": {},
        "type": "Feature",
        "geometry": polygon
      }
      flattened.push(feature)
    }
  }
});
o.features = flattened
o.features.forEach(function (feature, idx) {
  var box = feature.geometry.coordinates.reduce(function reducer(prev, current) {
    current.forEach(function each(coor) {
      var [lng, lat] = coor
      if (lng < prev.minLng) {
        prev.minLng = lng
      } else if (lng > prev.maxLng) {
        prev.maxLng = lng
      }
      if (lat < prev.minLat) {
        prev.minLat = lat
      } else if (lat > prev.maxLat) {
        prev.maxLat = lat
      }
    })
    //var lng = current[0][0], lat = current[0][1]
    //console.log("lng", lng, "lat", lat)
    //console.log("current:", cur)

    return prev
  }, { minLat: 90, minLng: 180, maxLat: -90, maxLng: -180 })
  //console.log("Bounding box: ", box)
  feature.id = idx
  feature.properties.name = idx
  feature.properties.boundingBox = [box.minLng, box.maxLng, box.minLat, box.maxLat]
  feature.properties.centroid = {
    "lng": (box.maxLng + box.minLng) / 2,
    "lat": (box.maxLat + box.minLat) / 2
  }
  /*
  = {
  "name" : idx //placeholder
}
*/
  feature.geometry.crs = {
    "type": "name",
    "properties": {
      "name": "EPSG:4326"
    }
  }
})
// o.features.forEach(function (feature) {
//         feature.geometry.coordinates[0][0].forEach(function (elm) {
//                 //remove z-index
//                 elm.splice(2,1)
//         })
// })
//o.features.splice(0, maxPolygonCount)
var spliced = Array()
for (let i = startCount; i < maxPolygonCount + startCount; ++i) {
  spliced.push(o.features[i])
}
o.features = spliced
console.log(`length: ${o.features.length}`)
var result = JSON.stringify(o)
fs.writeFileSync(outputName + ".json", result)
fs.writeFileSync(outputName + "_pretty.json", JSON.stringify(o, null, 2))
