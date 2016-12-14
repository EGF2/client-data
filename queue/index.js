"use strict";

const config = require("../components").config;

// Initialize storage
let queue;
switch (config.queue) {
case "rethinkdb":
    // use storage to produce events to RethinkDB
    break;
case "kafka":
    queue = require("./kafka");
    break;
default:
    throw new Error("Unsupported queue type");
}
module.exports = queue;
