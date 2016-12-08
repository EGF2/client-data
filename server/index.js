"use strict";

const restify = require("restify");
const objects = require("./objects");
const edges = require("./edges");
const commons = require("./commons");

function createServer() {
    let server = restify.createServer({
        name: "client-data"
    });

    server.use(restify.queryParser());
    server.use(restify.bodyParser({
        mapParams: false
    }));

    server.get("/v1/graph", commons.getGraphConfig);

    // objects API
    server.get("/v1/graph/:ids", objects.getObjects);
    server.post("/v1/graph", objects.createObject);
    server.put("/v1/graph/:id", objects.updateObject);
    server.del("/v1/graph/:id", objects.deleteObject);

    // edges API
    server.get("/v1/graph/:src/:edge_name", edges.getEdgeObjects);
    server.get("/v1/graph/:src/:edge_name/:dst", edges.getEdgeObject);
    server.post("/v1/graph/:src/:edge_name/:dst", edges.createEdge);
    server.del("/v1/graph/:src/:edge_name/:dst", edges.deleteEdge);

    return server;
}
module.exports.createServer = createServer;
