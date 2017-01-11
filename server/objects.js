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
        yield applyUniqueConstraint(object);

        yield storage.createObject(object);

        if (!objConfig.suppress_event) {
            let author = req.headers.author;
            let event = createObjectEvent("POST", object, undefined, author);
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
        if (previous.deleted_at) {
            throw new errors.ObjectDeleted();
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
        yield applyUniqueConstraint(current, previous);

        yield storage.updateObject(id, delta, deleteFields);

        if (!objConfig.suppress_event) {
            let author = req.headers.author;
            let event = createObjectEvent("PUT", current, previous, author);
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
        if (previous.deleted_at) {
            throw new errors.ObjectDeleted();
        }

        yield applyUniqueConstraint(null, previous);

        if (objConfig.volatile) {
            yield storage.deleteObject(id);
        } else {
            yield storage.updateObject(id, {deleted_at: now}, []);
        }

        if (!objConfig.suppress_event) {
            let author = req.headers.author;
            let event = createObjectEvent("DELETE", undefined, previous, author);
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
function createObjectEvent(method, current, previous, author) {
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
    if (author) {
        event.user = author;
    }

    return event;
}

/**
 * Return unique values from object
 */
function getUniqueValues(object) {
    if (object) {
        let values = [];
        let cfg = commons.getObjectConfig(object.object_type);
        Object.keys(object).map(field => {
            if (cfg.fields[field].unique) {
                values.push(`${object.object_type}-${field}-${object[field]}`);
            }
        });
        return values;
    }
    return [];
}

/**
 * Apply unique constraints
 */
function applyUniqueConstraint(current, previous) {
    let cur = getUniqueValues(current);
    let prev = getUniqueValues(previous);

    let add = _.difference(cur, prev);
    let del = _.difference(prev, cur);

    return Promise.all(add.map(value =>
        storage.addUnique(value).then(() => true).catch(() => false)
    ))
    .then(added => {
        let incorrect = added.indexOf(false);
        if (incorrect > -1) {
            // remove all added unique values
            return Promise.all(added.map((v, i) =>
                v ? storage.removeUnique(add[i]) : undefined
            )).then(() => {
                throw new errors.UniqueConstraintViolated(add[incorrect]);
            });
        }
    })
    .then(() => Promise.all(del.map(value => storage.removeUnique(value))));
}

module.exports = {
    createObject,
    getObjects,
    updateObject,
    deleteObject
};
