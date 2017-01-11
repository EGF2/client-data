"use strict";

/* eslint camelcase: 0 */
/* eslint max-params: ["error", 6] */

const co = require("co");
const storage = require("../storage");
const queue = require("../queue");
const commons = require("./commons");
const errors = require("./errors");
const microtime = require("microtime");
const graphConfig = require("../components").config.graph;

/**
 * Check edge config
 */
function checkEdge(srcID, edgeName, dstID) {
    let objectType = commons.getObjectType(srcID);
    let config = commons.getObjectConfig(objectType);
    let edge = config.edges[edgeName];
    if (!edge) {
        throw new errors.UnknownEdge(srcID, edgeName);
    }

    let dstObjectType = commons.getObjectType(dstID);
    if (!edge.contains.find(type => type === dstObjectType)) {
        throw new errors.UnsupportedDestinationObject(srcID, edgeName, dstID);
    }
}

/**
 * Get edge object
 */
function getEdgeObject(req, res, next) {
    return co(function *() {
        let p = req.params;
        checkEdge(p.src, p.edge_name, p.dst);
        let data = yield Promise.all([
            storage.getEdge(p.src, p.edge_name, p.dst), // check edge exists
            storage.getObject(p.dst) // get edge object
        ]);

        let edge = data[0];
        let object = data[1];
        if (!edge) {
            throw new errors.EdgeNotExists(p.src, p.edge_name, p.dst);
        } else if (!object) {
            throw new errors.DestinationObjectNotExists(p.src, p.edge_name, p.dst);
        }

        return object;
    })
    .then(object => res.send(object))
    .catch(next);
}

/**
 * Get edge objects
 */
function getEdgeObjects(req, res, next) {
    return co(function *() {
        let p = req.params;

        // check edge config
        let objectType = commons.getObjectType(p.src);
        let config = commons.getObjectConfig(objectType);
        if (!(p.edge_name in config.edges)) {
            throw new errors.UnknownEdge(p.src, p.edge_name);
        }

        // set default page size
        if (p.count === undefined) {
            p.count = graphConfig.pagination.default_count || 25;
        } else {
            p.count = Number(p.count);
            if (isNaN(p.count) || p.count < 0 || p.count > graphConfig.pagination.max_count) {
                throw new errors.IncorrectCountParameter(graphConfig.pagination.max_count);
            }
        }

        let objects = p.count === 0 ? [] :
            storage.getEdges(p.src, p.edge_name, p.count, p.after)
                .then(ids => Promise.all(ids.map(id => storage.getObject(id))));

        let data = yield Promise.all([
            objects,
            storage.getEdgeCount(p.src, p.edge_name)
        ]);
        let page = {
            results: data[0],
            count: data[1]
        };

        // set first and last elements
        if (page.results.length) {
            let params = storage.getFirstAndLastParams(page.results, p.after);
            if (params.first) {
                page.first = params.first;
            }
            if (params.last && page.results.length === p.count) {
                page.last = params.last;
            }
        }

        return page;
    })
    .then(results => res.send(results))
    .catch(next);
}

/**
 * Create edge
 */
function createEdge(req, res, next) {
    return co(function *() {
        let p = req.params;
        let now = new Date();

        checkEdge(p.src, p.edge_name, p.dst);

        // check edge already exists
        let edge = yield storage.getEdge(p.src, p.edge_name, p.dst);
        if (edge) {
            throw new errors.EdgeAlreadyExists(p.src, p.edge_name, p.dst);
        }

        yield storage.createEdge(p.src, p.edge_name, p.dst, now.toISOString());

        let author = req.headers.author;
        let event = createEdgeEvent("POST", p.src, p.edge_name, p.dst, author);
        yield storage.saveEvent(event);
        if (queue) {
            yield queue.sendEvent(event);
        }

        return {
            created_at: now
        };
    })
    .then(created => res.send(created))
    .catch(next);
}

/**
 * Delete edge
 */
function deleteEdge(req, res, next) {
    return co(function *() {
        let p = req.params;

        checkEdge(p.src, p.edge_name, p.dst);

        // check edge exists
        let edge = yield storage.getEdge(p.src, p.edge_name, p.dst);
        if (!edge) {
            throw new errors.EdgeNotExists(p.src, p.edge_name, p.dst);
        }

        yield storage.deleteEdge(p.src, p.edge_name, p.dst);

        let author = req.headers.author;
        let event = createEdgeEvent("DELETE", p.src, p.edge_name, p.dst, author);
        yield storage.saveEvent(event);
        if (queue) {
            yield queue.sendEvent(event);
        }

        return {
            deleted_at: new Date()
        };
    })
    .then(deleted => res.send(deleted))
    .catch(next);
}

/**
 * Create edge event
 */
function createEdgeEvent(method, srcId, edgeName, dstId, author) {
    let event = {
        id: commons.generateID("event"),
        object_type: "event",
        method,
        edge: {
            src: srcId,
            name: edgeName,
            dst: dstId
        },
        created_at: microtime.now()
    };

    if (author) {
        event.user = author;
    }

    return event;
}

module.exports = {
    createEdge,
    getEdgeObject,
    getEdgeObjects,
    deleteEdge
};
