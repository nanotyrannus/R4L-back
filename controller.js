"use strict"

let services = require("services");

module.exports = {
  "getUserPolygons" : function* (eventId, username) {
    var featCol = services.getEventPolygons(eventId)
    var colors = services.getUserPolygonColors(username, eventId)

    
  }
}
