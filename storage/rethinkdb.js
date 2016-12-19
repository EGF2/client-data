"use strict";

/* eslint camelcase: 0 */

const config = require("../components").config;
const r = require("rethinkdbdash")(config.rethinkdb);

/**
 * Init storage
 */
function init() {
    let options = {shards: 1, replicas: 1};
    let dbName = config.rethinkdb.db || r._db;
    return r.dbCreate(dbName).run().then(() =>
        Promise.all([
            r.tableCreate("objects", options).run(),
            r.tableCreate("edges", options).then(() =>
                r.table("edges").indexCreate("edge_sorting", [r.row("src"), r.row("edge_name"), r.row("sort_by"), r.row("dst")])
            ),
            r.tableCreate("events", options).then(() =>
                r.table("events").indexCreate("created_at")
            ),
            r.tableCreate("event_offset", options),
            r.tableCreate("unique", options)
        ])
    );
}

/**
 * Check database schema
 */
function checkDB() {
    return r.tableList().run();
}

/**
 * Get object by id
 */
function getObject(id) {
    return r.table("objects").get(id).run();
}

/**
 * Create object
 */
function createObject(object) {
    return r.table("objects").insert(object).run();
}

/**
 * Update object
 */
function updateObject(id, delta, deleteFields) {
    let update = r.table("objects").get(id).update(delta).run();
    if (deleteFields) {
        update = update.then(() =>
            r.table("objects").get(id).replace(doc => doc.without(deleteFields)).run()
        );
    }
    return update;
}

/**
 * Delete object
 */
function deleteObject(id) {
    return r.table("objects").get(id).delete().run()
        .then(res => res.deleted);
}

/**
 * Get edge object
 */
function getEdge(srcID, edgeName, dstID) {
    return r.table("edges").get(`${srcID}_${edgeName}_${dstID}`).run();
}

/**
 * Get edges from DB
 */
function getEdges(srcID, edgeName, count, after) {
    let skip = (Number(after) + 1) || 0;
    if (skip < 0) {
        skip = 0;
    }
    return r.table("edges")
        .between([srcID, edgeName, r.minval, r.minval],
            [srcID, edgeName, r.maxval, r.maxval],
            {index: "edge_sorting"})
        .orderBy({index: r.desc("edge_sorting")})
        .skip(skip)
        .limit(count)
        .run()
        .then(edges => edges.map(edge => edge.dst));
}

/**
 * Get edge count
 */
function getEdgeCount(srcID, edgeName) {
    return r.table("edges")
        .between([srcID, edgeName, r.minval, r.minval],
            [srcID, edgeName, r.maxval, r.maxval],
            {index: "edge_sorting"})
        .count().run();
}

/**
 * get first and last values
 */
function getFirstAndLastParams(objects, after) {
    if (objects.length) {
        let first = (Number(after) + 1) || 0;
        let last = first + (objects.length - 1);
        first = String(first);
        last = String(last);
        return {first, last};
    }
    return {};
}

/**
 * Create edge
 */
function createEdge(srcID, edgeName, dstID, sortValue) {
    return r.table("edges").insert({
        id: `${srcID}_${edgeName}_${dstID}`,
        src: srcID,
        edge_name: edgeName,
        dst: dstID,
        sort_by: sortValue
    }).run();
}

/**
 * Delete edge
 */
function deleteEdge(srcID, edgeName, dstID) {
    return r.table("edges").get(`${srcID}_${edgeName}_${dstID}`).delete().run();
}

/**
 * Save event
 */
function saveEvent(event) {
    return r.table("events").insert(event).run();
}

/**
 * Add unique record
 */
function addUnique(id) {
    return r.table("unique").insert({id}).run().then(res => {
        if (res.errors) {
            throw new Error("NotUnique");
        }
    });
}

/**
 * Remove unique record
 */
function removeUnique(id) {
    return r.table("unique").get(id).delete().run();
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

    saveEvent,
    addUnique,
    removeUnique
};
