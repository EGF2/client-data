"use strict";

/* eslint camelcase: 0 */

const config = require("../components").config;
const cassandraDriver = require("cassandra-driver");
const cassandra = new cassandraDriver.Client(config.cassandra);
const commons = require("../server/commons");

/**
 * Init storage
 */
function init() {
    const cli = new cassandraDriver.Client({contactPoints: config.cassandra.contactPoints});
    let createKeyspace = new Promise((resolve, reject) =>
        cli.execute(`CREATE KEYSPACE IF NOT EXISTS ${config.cassandra.keyspace} WITH REPLICATION = {'class' : 'SimpleStrategy', 'replication_factor' : 1}`, err => {
            if (err) {
                return reject(err);
            }
            resolve();
        })
    ).then(() => cli.shutdown());

    return createKeyspace.then(() => Promise.all([
        execute("CREATE TABLE objects (id TEXT, type TEXT, fields MAP<TEXT, TEXT>, PRIMARY KEY (type, id))"),
        execute("CREATE TABLE edges (src TEXT, name TEXT, dst TEXT, sort_value TEXT, PRIMARY KEY ((name, src), sort_value, dst)) WITH CLUSTERING ORDER BY (sort_value DESC)")
            .then(() => execute("CREATE INDEX ON edges (dst)")),
        execute("CREATE TYPE EDGE (src TEXT, name TEXT, dst TEXT)").then(() =>
            execute("CREATE TABLE events (id TEXT, object_type TEXT, method TEXT, object TEXT, edge EDGE, current MAP<TEXT, TEXT>, previous MAP<TEXT, TEXT>, created_at BIGINT, PRIMARY KEY (id))")
        )
    ]));
}

/**
 * Check database schema
 */
function checkDB() {
    return execute("SELECT * FROM objects LIMIT 1");
}

function execute(query, params) {
    return new Promise((resolve, reject) => {
        cassandra.execute(query, params || [], {prepared: true},
            (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            }
        );
    });
}

function getObjectType(id) {
    return Promise.resolve().then(() =>
        commons.getObjectType(id)
    );
}

/**
 * Get object by id
 */
function getObject(id) {
    return getObjectType(id).then(objectType =>
        execute("SELECT fields FROM objects WHERE id=? AND type=?", [id, objectType])
        .then(result => {
            if (result.rows.length) {
                let object = result.rows[0].fields;
                Object.keys(object).forEach(field => {
                    object[field] = JSON.parse(object[field]);
                });
                return object;
            }
        })
    );
}

/**
 * Create object
 */
function createObject(object) {
    let obj = {
        id: object.id,
        type: object.object_type,
        fields: Object.assign({}, object)
    };
    Object.keys(obj.fields).forEach(field => {
        obj.fields[field] = JSON.stringify(obj.fields[field]);
    });
    return execute("INSERT INTO objects JSON ?", [JSON.stringify(obj)]);
}

/**
 * Update object
 */
function updateObject(id, delta, deleteFields) {
    return getObjectType(id).then(objectType => {
        delta = Object.assign({}, delta);
        Object.keys(delta).forEach(field => {
            delta[field] = JSON.stringify(delta[field]);
        });
        return execute("UPDATE objects SET fields=fields+fromJson(?), fields=fields-? WHERE id=? AND type=?",
            [JSON.stringify(delta), deleteFields, id, objectType]);
    });
}

/**
 * Delete object
 */
function deleteObject(id) {
    return getObjectType(id).then(objectType =>
        execute("DELETE FROM objects WHERE id=? AND type=?", [id, objectType])
    );
}

/**
 * Get edge object
 */
function getEdge(srcID, edgeName, dstID) {
    return execute("SELECT * FROM edges WHERE src = ? AND name = ? AND dst = ?",
        [srcID, edgeName, dstID])
        .then(result => result.rows[0]);
}

/**
 * Get edges from DB
 */
function getEdges(srcID, edgeName, count, after) {
    let query = "SELECT dst FROM edges WHERE src = ? AND name = ?";
    let params = [srcID, edgeName];
    let next = Promise.resolve();
    if (after) {
        query += " AND sort_value < ?";
        next = next.then(() =>
            execute("SELECT sort_value FROM edges WHERE src = ? AND name = ? AND dst = ?",
                [srcID, edgeName, after])
        ).then(edge => {
            params.push(edge.rows[0].sort_value);
        });
    }
    query += " ORDER BY sort_value DESC LIMIT " + count;
    return next.then(() => execute(query, params))
        .then(result => result.rows.map(row => row.dst));
}

/**
 * Get edge count
 */
function getEdgeCount(srcID, edgeName) {
    return execute("SELECT COUNT(*) FROM edges WHERE src = ? AND name = ?", [srcID, edgeName])
        .then(result => result.rows.length ? Number(result.rows[0].count) : 0);
}

/**
 * get first and last values
 */
function getFirstAndLastParams(objects) {
    if (objects.length) {
        let first = objects[0].id;
        let last = objects.slice(-1)[0].id;
        return {first, last};
    }
    return {};
}

/**
 * Create edge
 */
function createEdge(srcID, edgeName, dstID, sortValue) {
    return execute("INSERT INTO edges (src, name, dst, sort_value) VALUES (?, ?, ?, ?)",
        [srcID, edgeName, dstID, sortValue]);
}

/**
 * Delete edge
 */
function deleteEdge(srcID, edgeName, dstID) {
    return execute("SELECT sort_value FROM edges WHERE src = ? AND name = ? AND dst = ?", [srcID, edgeName, dstID])
        .then(edge => execute("DELETE FROM edges WHERE src = ? AND name = ? AND dst = ? AND sort_value = ?",
            [srcID, edgeName, dstID, edge.rows[0].sort_value])
        );
}

/**
 * Save event
 */
function saveEvent(event) {
    event = Object.assign({}, event);
    if (event.current) {
        event.current = Object.assign({}, event.current);
        Object.keys(event.current).forEach(field => {
            event.current[field] = JSON.stringify(event.current[field]);
        });
    }
    if (event.previous) {
        event.previous = Object.assign({}, event.previous);
        Object.keys(event.previous).forEach(field => {
            event.previous[field] = JSON.stringify(event.previous[field]);
        });
    }
    return execute("INSERT INTO events JSON ?", [JSON.stringify(event)]);
}

module.exports = {
    init,
    checkDB,

    getObject,
    createObject,
    updateObject,
    deleteObject,

    getEdge,
    getEdges,
    getEdgeCount,
    getFirstAndLastParams,
    createEdge,
    deleteEdge,

    saveEvent
};
