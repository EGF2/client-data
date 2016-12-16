"use strict";

/* eslint camelcase: 0 */

const co = require("co");
const commons = require("./commons");
const storage = require("../storage");
const queue = require("../queue");
const errors = require("./errors");
const microtime = require("microtime");
const validate = require("./validate");
const _ = require("underscore");

/**
 * Get object by ID
 */
function getObjects(req, res, next) {
    return co(function *() {
        let ids = req.params.ids.split(",");
        let objects = yield ids.map(function *(id) {
            // check object type
            commons.getObjectType(id);
            let object = yield storage.getObject(id);
            if (!object) {
                throw new errors.ObjectNotExists(id);
            }
            return object;
        });
        if (objects.length > 1) {
            let params = storage.getFirstAndLastParams(objects);
            return {
                results: objects,
                first: params.first,
                count: objects.length
            };
        }
        return objects[0];
    })
    .then(object => res.send(object))
    .catch(next);
}

/**
 * Create object with new ID
 */
function createObject(req, res, next) {
    return co(function *() {
        let object = req.body;
        let now = new Date();
        let objConfig = commons.getObjectConfig(object.object_type);
        object.id = commons.generateID(object.object_type);
        object.created_at = now;
        object.modified_at = now;
        validate(object);
        yield checkUnique(object);

        yield storage.createObject(object);

        if (!objConfig.suppress_event) {
            let event = createObjectEvent("POST", object, undefined, now);
            yield storage.saveEvent(event);
            if (queue) {
                yield queue.sendEvent(event);
            }
        }

        return object;
    })
    .then(object => res.send(object))
    .catch(next);
}

/**
 * Update object by ID
 */
function updateObject(req, res, next) {
    return co(function *() {
        let id = req.params.id;
        let delta = req.body;

        let objectType = commons.getObjectType(id);
        let objConfig = commons.getObjectConfig(objectType);
        let previous = yield storage.getObject(id);
        if (!previous) {
            throw new errors.ObjectNotExists(id);
        }

        // check delete_fields
        let deleteFields = delta.delete_fields;
        delete delta.delete_fields;

        // prepare current object
        let current = Object.assign({}, previous);
        current = Object.assign(current, delta);
        if (deleteFields) {
            deleteFields.forEach(field => {
                delete current[field];
            });
        }

        // update only if there are changes
        if (_.isEqual(current, previous)) {
            return current;
        }

        current.modified_at = new Date();
        validate(current);

        yield storage.updateObject(id, delta, deleteFields);

        if (!objConfig.suppress_event) {
            let event = createObjectEvent("PUT", current, previous, delta.modified_at);
            yield storage.saveEvent(event);
            if (queue) {
                yield queue.sendEvent(event);
            }
        }

        return current;
    })
    .then(object => res.send(object))
    .catch(next);
}

/**
 * Delete object from DB
 */
function deleteObject(req, res, next) {
    return co(function *() {
        let id = req.params.id;
        let now = new Date();
        let objectType = commons.getObjectType(id);
        let objConfig = commons.getObjectConfig(objectType);
        let previous = yield storage.getObject(id);
        if (!previous) {
            throw new errors.ObjectNotExists(id);
        }
        yield storage.deleteObject(id);

        if (!objConfig.suppress_event) {
            let event = createObjectEvent("DELETE", undefined, previous, now);
            yield storage.saveEvent(event);
            if (queue) {
                yield queue.sendEvent(event);
            }
        }

        return {
            deleted_at: now
        };
    })
    .then(deleted => res.send(deleted))
    .catch(next);
}

/**
 * Create object event
 */
function createObjectEvent(method, current, previous) {
    let data = current || previous;
    let event = {
        id: commons.generateID("event"),
        object_type: "event",
        method,
        object: data.id,
        created_at: microtime.now()
    };

    if (current) {
        event.current = current;
    }
    if (previous) {
        event.previous = previous;
    }

    return event;
}

/**
 * Check unique field's values
 */
function checkUnique(object) {
    let cfg = commons.getObjectConfig(object.object_type);
    return Promise.all(Object.keys(object).map(field => {
        if (cfg.fields[field].unique) {
            return storage.addUnique(`${object.object_type}-${field}-${object[field]}`)
                .catch(err => {
                    if (err.message === "NotUnique") {
                        throw new errors.UniqueConstraintViolated(field);
                    }
                    throw err;
                });
        }
        return Promise.resolve();
    }));
}

module.exports = {
    createObject,
    getObjects,
    updateObject,
    deleteObject
};
