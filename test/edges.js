"use strict";

/* eslint camelcase: 0 */
/* eslint max-nested-callbacks: 0 */

const assert = require("assert");
const request = require("supertest");

let server;

function createTestObjects(values) {
    values = [];
    for (let i = 0; i < arguments.length; i++) {
        values.push(arguments[i]);
    }
    return Promise.all(values.map(val =>
        new Promise((resolve, reject) => {
            request(server)
                .post("/v1/graph")
                .set("Content-Type", "application/json")
                .send({
                    object_type: "test_object",
                    str_field: val
                })
                .end((err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(res.body);
                });
        })
    ));
}

function createTestEdge(srcID, dstID) {
    return new Promise((resolve, reject) => {
        request(server)
            .post(`/v1/graph/${srcID}/test_edge/${dstID}`)
            .end((err, res) => {
                if (err) {
                    return reject(err);
                }
                resolve(res.body);
            });
    });
}

describe("Edges API", () => {
    before(done => {
        require("../components").init()
        .then(() => {
            server = require("../server").createServer();
            done();
        })
        .catch(done);
    });

    describe("Create edge", () => {
        it("should create new edge", done => {
            createTestObjects("src", "dst")
            .then(objects => {
                request(server)
                    .post(`/v1/graph/${objects[0].id}/test_edge/${objects[1].id}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }
                        assert.ok(res.body.created_at);
                        done();
                    });
            });
        });

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
                .post("/v1/graph/src-01/edgeName/dstID")
                .expect(400, {
                    code: "UnknownEdge",
                    message: "Unknown edge src-01/edgeName"
                }, done);
        });

        it("should throw error for incorrect destination id", done => {
            request(server)
                .post("/v1/graph/src-01/test_edge/dstID")
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'dstID'"
                }, done);
        });
    });

    describe("Get edge", () => {
        it("should return destination object", done => {
            createTestObjects("src", "dst")
                .then(objects => {
                    createTestEdge(objects[0].id, objects[1].id)
                        .then(() => {
                            request(server)
                                .get(`/v1/graph/${objects[0].id}/test_edge/${objects[1].id}`)
                                .expect(200)
                                .end((err, res) => {
                                    if (err) {
                                        return done(err);
                                    }
                                    assert.equal(res.body.id, objects[1].id);
                                    assert.equal(res.body.object_type, objects[1].object_type);
                                    assert.equal(res.body.str_field, objects[1].str_field);
                                    assert.equal(res.body.created_at, objects[1].created_at);
                                    assert.equal(res.body.modified_at, objects[1].modified_at);
                                    done();
                                });
                        });
                });
        });

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
                .get("/v1/graph/src-01/edgeName/dstID")
                .expect(400, {
                    code: "UnknownEdge",
                    message: "Unknown edge src-01/edgeName"
                }, done);
        });

        it("should throw error for incorrect destination id", done => {
            request(server)
                .get("/v1/graph/src-01/test_edge/dstID")
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'dstID'"
                }, done);
        });
    });

    describe("Delete edge", () => {
        it("should delete edge", done => {
            createTestObjects("src", "dst")
                .then(objects => {
                    createTestEdge(objects[0].id, objects[1].id)
                        .then(() => {
                            request(server)
                                .delete(`/v1/graph/${objects[0].id}/test_edge/${objects[1].id}`)
                                .expect(200)
                                .end((err, res) => {
                                    if (err) {
                                        return done(err);
                                    }
                                    assert.ok(res.body.deleted_at);
                                    done();
                                });
                        });
                });
        });

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
                .delete("/v1/graph/src-01/edgeName/dstID")
                .expect(400, {
                    code: "UnknownEdge",
                    message: "Unknown edge src-01/edgeName"
                }, done);
        });

        it("should throw error for incorrect destination id", done => {
            request(server)
                .delete("/v1/graph/src-01/test_edge/dstID")
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'dstID'"
                }, done);
        });
    });
});
