"use strict";

const config = require("../components").config;

// Initialize storage
let queue;
switch (config.queue) {
case "kafka":
    queue = require("./kafka");
    break;
}
module.exports = queue;
