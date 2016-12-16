"use strict";

const restify = require("restify");
const util = require("util");

function ObjectNotExists(id) {
    restify.RestError.call(this, {
        restCode: "ObjectNotExists",
        statusCode: 404,
        message: `Object '${id}' doesn't exist`,
        constructorOpt: ObjectNotExists
    });
    this.name = "ObjectNotExists";
}
util.inherits(ObjectNotExists, restify.RestError);

function IncorrectObjectID(id) {
    restify.RestError.call(this, {
        restCode: "IncorrectObjectID",
        statusCode: 400,
        message: `Incorrect object ID '${id}'`,
        constructorOpt: IncorrectObjectID
    });
    this.name = "IncorrectObjectID";
}
util.inherits(IncorrectObjectID, restify.RestError);

function IncorrectObjectType(objectType) {
    restify.RestError.call(this, {
        restCode: "IncorrectObjectType",
        statusCode: 400,
        message: `Incorrect object type '${objectType}'`,
        constructorOpt: IncorrectObjectType
    });
    this.name = "IncorrectObjectType";
}
util.inherits(IncorrectObjectType, restify.RestError);

function UnknownObjectType() {
    restify.RestError.call(this, {
        restCode: "UnknownObjectType",
        statusCode: 400,
        message: "Unknown object type",
        constructorOpt: UnknownObjectType
    });
    this.name = "UnknownObjectType";
}
util.inherits(UnknownObjectType, restify.RestError);

function UnknownEdge(srcID, edgeName) {
    restify.RestError.call(this, {
        restCode: "UnknownEdge",
        statusCode: 400,
        message: `Unknown edge ${srcID}/${edgeName}`,
        constructorOpt: UnknownEdge
    });
    this.name = "UnknownEdge";
}
util.inherits(UnknownEdge, restify.RestError);

function UnsupportedDestinationObject(srcID, edgeName, dstID) {
    restify.RestError.call(this, {
        restCode: "UnsupportedDestinationObject",
        statusCode: 400,
        message: `Unsupported destination object for edge '${srcID}/${edgeName}/${dstID}'`,
        constructorOpt: UnsupportedDestinationObject
    });
    this.name = "UnsupportedDestinationObject";
}
util.inherits(UnsupportedDestinationObject, restify.RestError);

function EdgeNotExists(srcID, edgeName, dstID) {
    restify.RestError.call(this, {
        restCode: "EdgeNotExists",
        statusCode: 404,
        message: `Edge '${srcID}/${edgeName}/${dstID}' doesn't exist`,
        constructorOpt: EdgeNotExists
    });
    this.name = "EdgeNotExists";
}
util.inherits(EdgeNotExists, restify.RestError);

function DestinationObjectNotExists(srcID, edgeName, dstID) {
    restify.RestError.call(this, {
        restCode: "ObjectNotExists",
        statusCode: 404,
        message: `Destination object doesn't exist for edge '${srcID}/${edgeName}/${dstID}'`,
        constructorOpt: DestinationObjectNotExists
    });
    this.name = "DestinationObjectNotExists";
}
util.inherits(DestinationObjectNotExists, restify.RestError);

function EdgeAlreadyExists(srcID, edgeName, dstID) {
    restify.RestError.call(this, {
        restCode: "EdgeAlreadyExists",
        statusCode: 409,
        message: `Edge '${srcID}/${edgeName}/${dstID}' already exists`,
        constructorOpt: EdgeAlreadyExists
    });
    this.name = "EdgeAlreadyExists";
}
util.inherits(EdgeAlreadyExists, restify.RestError);

function ObjectIsNotValid(msg) {
    restify.RestError.call(this, {
        restCode: "ObjectIsNotValid",
        statusCode: 400,
        message: msg,
        constructorOpt: ObjectIsNotValid
    });
    this.name = "ObjectIsNotValid";
}
util.inherits(ObjectIsNotValid, restify.RestError);

function IncorrectCountParameter(max) {
    restify.RestError.call(this, {
        restCode: "IncorrectCountParameter",
        statusCode: 400,
        message: `Incorrect count parameter. Count parameter must be between 0 and ${max}`,
        constructorOpt: IncorrectCountParameter
    });
    this.name = "IncorrectCountParameter";
}
util.inherits(IncorrectCountParameter, restify.RestError);

function UniqueConstraintViolated(field) {
    restify.RestError.call(this, {
        restCode: "UniqueConstraintViolated",
        statusCode: 409,
        message: `Unique constraint violated for '${field}'`,
        constructorOpt: UniqueConstraintViolated
    });
    this.name = "UniqueConstraintViolated";
}
util.inherits(UniqueConstraintViolated, restify.RestError);

function ObjectDeleted() {
    restify.RestError.call(this, {
        restCode: "ObjectDeleted",
        statusCode: 409,
        message: "Couldn't change deleted object",
        constructorOpt: ObjectDeleted
    });
    this.name = "ObjectDeleted";
}
util.inherits(ObjectDeleted, restify.RestError);

module.exports = {
    ObjectNotExists,
    IncorrectObjectID,
    IncorrectObjectType,
    UnknownObjectType,
    UnknownEdge,
    UnsupportedDestinationObject,
    EdgeNotExists,
    DestinationObjectNotExists,
    EdgeAlreadyExists,
    ObjectIsNotValid,
    IncorrectCountParameter,
    UniqueConstraintViolated,
    ObjectDeleted
};
