"use strict";

module.exports = function (param) {
  console.log(param)
  return function () {
    console.log(param)
  }
}
