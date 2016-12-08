"use strict";

const config = require("../components").config;

// Initialize storage
let storage;
switch (config.storage) {
case "rethinkdb":
    storage = require("./rethinkdb");
    break;
case "cassandra":
    storage = require("./cassandra");
    break;
default:
    throw new Error("Unsupported storage type");
}
module.exports = storage;
