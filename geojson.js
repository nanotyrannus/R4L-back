var fs = require('fs')

var file = fs.readFileSync(process.argv[2])
var outputName = process.argv[3]

var o = JSON.parse(file.toString())
o.features[0].properties.Description = ""
o.features.forEach(function (feature, idx) {
    feature.id = idx
    feature.properties = {
        "name" : idx //placeholder
    }
    feature.geometry.crs = {
        "type" : "name",
        "properties" : {
          "name" : "EPSG:4326"
        }
      }
})
o.features.forEach(function (feature) {
        feature.geometry.coordinates[0][0].forEach(function (elm) {
                //remove z-index
                elm.splice(2,1)
        })
})
var result = JSON.stringify(o)
fs.writeFileSync(outputName + ".json", result)
fs.writeFileSync(outputName + "_pretty.json", JSON.stringify(o, null, 2))
