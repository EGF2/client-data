"use strict";

const request = require("supertest");

describe("Edges API", () => {
    let server;
    before(done => {
        require("../components").init().then(() => {
            server = require("../server").createServer();
            done();
        }).catch(done);
    });

    describe("Create edge", () => {
        it("should throw error for incorrect source id", done => {
            request(server)
                .post("/v1/graph/srcID/edgeName/dstID")
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'srcID'"
                }, done);
        });

        it("should throw error for incorrect edge name", done => {
            request(server)
                .post("/v1/graph/src-03/edgeName/dstID")
                .expect(400, {
                    code: "UnknownEdge",
                    message: "Unknown edge src-03/edgeName"
                }, done);
        });

        it("should throw error for incorrect destination id", done => {
            request(server)
                .post("/v1/graph/src-03/roles/dstID")
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'dstID'"
                }, done);
        });
    });

    describe("Get edge", () => {
        it("should throw error for incorrect source id", done => {
            request(server)
                .get("/v1/graph/srcID/edgeName/dstID")
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'srcID'"
                }, done);
        });

        it("should throw error for incorrect edge name", done => {
            request(server)
                .get("/v1/graph/src-03/edgeName/dstID")
                .expect(400, {
                    code: "UnknownEdge",
                    message: "Unknown edge src-03/edgeName"
                }, done);
        });

        it("should throw error for incorrect destination id", done => {
            request(server)
                .get("/v1/graph/src-03/roles/dstID")
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'dstID'"
                }, done);
        });
    });

    describe("Delete edge", () => {
        it("should throw error for incorrect source id", done => {
            request(server)
                .delete("/v1/graph/srcID/edgeName/dstID")
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'srcID'"
                }, done);
        });

        it("should throw error for incorrect edge name", done => {
            request(server)
                .delete("/v1/graph/src-03/edgeName/dstID")
                .expect(400, {
                    code: "UnknownEdge",
                    message: "Unknown edge src-03/edgeName"
                }, done);
        });

        it("should throw error for incorrect destination id", done => {
            request(server)
                .delete("/v1/graph/src-03/roles/dstID")
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'dstID'"
                }, done);
        });
    });
});
