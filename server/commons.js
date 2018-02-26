"use strict";

const config = require("../components").config;
const graph = config.graph;
const uuid = require("node-uuid");
const errors = require("./errors");

// get code to objectType map
let codeToObjectType = {};
Object.keys(graph)
    .filter(key => key !== "custom_schemas" && key !== "custom_schemas")
    .forEach(objectType => {
        codeToObjectType[graph[objectType].code] = objectType;
    });

/**
 * Get object type by ID
 */
function getObjectType(id) {
    let code = id.slice(-2);
    let objectType = codeToObjectType[code];
    if (!objectType) {
        throw new errors.IncorrectObjectID(id);
    }
    return objectType;
}

/**
 * Get object config by object type or ID
 */
function getObjectConfig(objectType) {
    if (!objectType) {
        throw new errors.UnknownObjectType(objectType);
    }
    let config = graph[objectType];
    if (!config) {
        throw new errors.IncorrectObjectType(objectType);
    }
    return config;
}

/**
 * Generate ID for objectType
 */
function generateID(objectType) {
    if (!objectType) {
        throw new errors.UnknownObjectType();
    } else if (!(objectType in graph)) {
        throw new errors.IncorrectObjectType(objectType);
    }
    let objectCode = graph[objectType].code;
    return `${uuid.v4()}-${objectCode}`;
}

function getGraphConfig(req, res) {
    res.send(200, graph);
}

function getHealthcheck(req, res) {
    res.send(200);
}

module.exports = {
    getObjectType,
    getObjectConfig,
    generateID,
    getGraphConfig,
    getHealthcheck
};
