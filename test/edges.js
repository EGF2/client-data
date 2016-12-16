"use strict";

/* eslint camelcase: 0 */
/* eslint max-nested-callbacks: ["error", 6] */

const assert = require("assert");
const request = require("supertest");

let server;

function createTestObjects(values) {
    values = [];
    for (let i = 0; i < arguments.length; i++) {
        values.push(arguments[i]);
    }

    let promise = Promise.resolve();
    let objects = [];
    values.forEach(val => {
        promise = promise.then(() =>
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
                        objects.push(res.body);
                        resolve();
                    });
            })
        );
    });
    return promise.then(() => objects);
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
                                    assert.deepEqual(res.body, objects[1]);
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

    describe("Get edges", () => {
        let src;
        let dsts;
        before(done => {
            createTestObjects("src", "dst1", "dst2", "dst3", "dst4", "dst5")
                .then(objects => {
                    src = objects[0];
                    dsts = objects.slice(1);
                    let promise = Promise.resolve();
                    objects.slice(1).reverse().forEach(dst => {
                        promise = promise.then(() => createTestEdge(src.id, dst.id));
                    });
                    return promise;
                }).then(() => done());
        });

        it("should return first page", done => {
            request(server)
                .get(`/v1/graph/${src.id}/test_edge`)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        done(err);
                    }
                    assert.equal(res.body.count, 5);
                    assert.equal(res.body.first, 0);
                    assert.deepEqual(res.body.results, dsts);
                    done();
                });
        });

        it("should return objects count", done => {
            request(server)
                .get(`/v1/graph/${src.id}/test_edge?count=0`)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        done(err);
                    }
                    assert.equal(res.body.count, 5);
                    assert.deepEqual(res.body.results, []);
                    assert.equal(res.body.first, undefined);
                    assert.equal(res.body.last, undefined);
                    done();
                });
        });

        it("should return 2 objects after zero index", done => {
            request(server)
                .get(`/v1/graph/${src.id}/test_edge?after=0&count=2`)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        done(err);
                    }
                    assert.equal(res.body.count, 5);
                    assert.equal(res.body.first, 1);
                    assert.equal(res.body.last, 2);
                    assert.deepEqual(res.body.results, dsts.slice(1, 3));
                    done();
                });
        });

        it("should return empty results for extra page", done => {
            request(server)
                .get(`/v1/graph/${src.id}/test_edge?after=20`)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        done(err);
                    }
                    assert.equal(res.body.count, 5);
                    assert.equal(res.body.first, undefined);
                    assert.equal(res.body.last, undefined);
                    assert.deepEqual(res.body.results, []);
                    done();
                });
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
