"use strict";

/* eslint camelcase: 0 */
/* eslint max-params: 0 */

const _ = require("underscore");
const config = require("../components").config;
const graph = config.graph;
const customSchemas = graph.custom_schemas;
const errors = require("./errors");

const validators = {
    email: val => {
        let re = /^[-a-z0-9~!$%^&*_=+}{'?]+(\.[-a-z0-9~!$%^&*_=+}{'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/;
        return re.test(val);
    }
};

function isInteger(val) {
    return _.isNumber(val) && val.toString().indexOf(".") === -1;
}

const check = {
    string: (val, type, subtype, field, fieldCfg) => {
        if (!_.isString(val)) {
            throw new errors.ObjectIsNotValid(`'${field}' must be ${type}`);
        }
        if ("min" in fieldCfg) {
            if (val.length < fieldCfg.min) {
                throw new errors.ObjectIsNotValid(`'${field}' must have length more than ${fieldCfg.min}`);
            }
        }
        if ("max" in fieldCfg) {
            if (val.length > fieldCfg.max) {
                throw new errors.ObjectIsNotValid(`'${field}' must have length less than ${fieldCfg.max}`);
            }
        }
        if ("validator" in fieldCfg) {
            if (fieldCfg.validator in validators) {
                if (!validators[fieldCfg.validator](val)) {
                    throw new errors.ObjectIsNotValid(`'${val}' is not valid ${fieldCfg.validator}`);
                }
            } else {
                throw new errors.ObjectIsNotValid(`Can not find custom validator for '${fieldCfg.validator}'`);
            }
        }
    },
    number: (val, type, subtype, field, fieldCfg) => {
        if (!_.isNumber(val) || isInteger(val)) {
            throw new errors.ObjectIsNotValid(`'${field}' must be ${type}`);
        }
        if ("min" in fieldCfg) {
            if (val < fieldCfg.min) {
                throw new errors.ObjectIsNotValid(`'${field}' must be more than ${fieldCfg.min}`);
            }
        }
        if ("max" in fieldCfg) {
            if (val > fieldCfg.max) {
                throw new errors.ObjectIsNotValid(`'${field}' must be less than ${fieldCfg.max}`);
            }
        }
    },
    integer: (val, type, subtype, field, fieldCfg) => {
        if (!isInteger(val)) {
            throw new errors.ObjectIsNotValid(`'${field}' must be ${type}`);
        }
        if ("min" in fieldCfg) {
            if (val < fieldCfg.min) {
                throw new errors.ObjectIsNotValid(`'${field}' must be more than ${fieldCfg.min}`);
            }
        }
        if ("max" in fieldCfg) {
            if (val > fieldCfg.max) {
                throw new errors.ObjectIsNotValid(`'${field}' must be less than ${fieldCfg.max}`);
            }
        }
    },
    boolean: (val, type, subtype, field) => {
        if (!_.isBoolean(val)) {
            throw new errors.ObjectIsNotValid(`'${field}' must be ${type}`);
        }
    },
    date: (val, type, subtype, field) => {
        let valid = _.isString(val) && Date.parse(val);
        valid = valid || _.isDate(val);
        if (!valid) {
            throw new errors.ObjectIsNotValid(`'${field}' must be ${type}`);
        }
    },
    object_id: (val, type, subtype, field, fieldCfg) => {
        let codes = fieldCfg.object_types.map(type => {
            if (type === "any") {
                return "[0-9]{2}";
            }
            return graph[type].code;
        }).join("|");
        let re = new RegExp(
            "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-(" + codes + ")$");
        if (_.isNull(val.match(re))) {
            throw new errors.ObjectIsNotValid(`'${field}' must be ${fieldCfg.object_types} id`);
        }
    },
    struct: (val, type, subtype, field, fieldCfg) => {
        if (!_.isObject(val)) {
            throw new errors.ObjectIsNotValid(`'${field}' must be ${type}`);
        }
        let subCfg = fieldCfg.schema;
        if (_.isString(subCfg)) {
            subCfg = customSchemas[subCfg];
        }
        if (!_.isObject(subCfg)) {
            throw new errors.ObjectIsNotValid(`Can not find config for nested type ${subtype}`);
        }
        validateObject(val, subCfg);
    },
    array: (val, type, subtype, field, fieldCfg) => {
        if (!_.isArray(val)) {
            throw new errors.ObjectIsNotValid(`'${field}' must be ${type}`);
        }
        if ("min" in fieldCfg) {
            if (val.length < fieldCfg.min) {
                throw new errors.ObjectIsNotValid(`'${field}' must have length more than ${fieldCfg.min}`);
            }
        }
        if ("max" in fieldCfg) {
            if (val.length > fieldCfg.max) {
                throw new errors.ObjectIsNotValid(`'${field}' must have length less than ${fieldCfg.max}`);
            }
        }
        val.forEach(subVal => {
            checkType(subVal, subtype, undefined, field, fieldCfg);
        });
    }
};

function checkType(val, type, subtype, field, fieldCfg) {
    if (!(type in check)) {
        throw new errors.ObjectIsNotValid(`Unknown '${type}' type in config`);
    }
    check[type](val, type, subtype, field, fieldCfg);
}

function validateObject(object, cfg) {
    // dissallow field that not in config
    Object.keys(object).forEach(field => {
        if (!(field in cfg)) {
            throw new errors.ObjectIsNotValid(`Unexpected extra field '${field}'`);
        }
    });

    Object.keys(cfg).forEach(field => {
        let fieldCfg = cfg[field];
        // disallow null
        if (_.isNull(object[field])) {
            throw new errors.ObjectIsNotValid(`'${field}' can not be null`);
        }

        // set default values
        if ("default" in fieldCfg && _.isUndefined(object[field])) {
            object[field] = fieldCfg.default;
        }

        let val = object[field];
        // check if field is required
        if (_.isUndefined(val) && fieldCfg.required) {
            throw new errors.ObjectIsNotValid(`'${field}' field is required`);
        }

        if (_.isUndefined(val)) {
            return;
        }

        // get field type and subtype
        let t = fieldCfg.type.split(":");
        let type = t[0];
        let subtype = t[1];
        // check type
        checkType(val, type, subtype, field, fieldCfg);

        // check enum
        if ("enum" in fieldCfg) {
            if (fieldCfg.enum.indexOf(val) === -1) {
                throw new errors.ObjectIsNotValid(`'${field}' must be one of: ${fieldCfg.enum}`);
            }
        }
    });
}

function validate(object) {
    let cfg = graph[object.object_type].fields;
    cfg = _.extend(cfg, graph.common_fields);
    validateObject(object, cfg);
}
module.exports = validate;
