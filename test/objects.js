"use strict";

/* eslint camelcase: 0 */

const assert = require("assert");
const request = require("supertest");

describe("Objects API", () => {
    let server;
    before(done => {
        require("../components").init().then(() => {
            server = require("../server").createServer();
            done();
        }).catch(done);
    });

    let object; // for future use
    describe("Create object", () => {
        it("should create object", done => {
            request(server)
                .post("/v1/graph")
                .set("Content-Type", "application/json")
                .send({
                    object_type: "test_object",
                    str_field: "test value"
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.equal(res.body.object_type, "test_object");
                    assert.equal(res.body.str_field, "test value");
                    object = res.body;
                    done();
                });
        });

        it("should throw error for incorrect object_type", done => {
            request(server)
                .post("/v1/graph")
                .set("Content-Type", "application/json")
                .send({object_type: "incorrect"})
                .expect(400, {
                    code: "IncorrectObjectType",
                    message: "Incorrect object type 'incorrect'"
                }, done);
        });

        it("should throw error for undefined object_type", done => {
            request(server)
                .post("/v1/graph")
                .set("Content-Type", "application/json")
                .send({})
                .expect(400, {
                    code: "UnknownObjectType",
                    message: "Unknown object type"
                }, done);
        });
    });

    describe("Get object", () => {
        it("should return object", done => {
            request(server)
                .get(`/v1/graph/${object.id}`)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.deepEqual(res.body, object);
                    done();
                });
        });

        it("should throw object doesn't exsit error", done => {
            request(server)
                .get("/v1/graph/incorrect-01")
                .expect(404, {
                    code: "ObjectNotExists",
                    message: "Object 'incorrect-01' doesn't exist"
                }, done);
        });

        it("should throw incorrect object id error", done => {
            request(server)
                .get("/v1/graph/incorrect_id")
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'incorrect_id'"
                }, done);
        });
    });

    describe("Update object", () => {
        it("should update object", done => {
            request(server)
                .put(`/v1/graph/${object.id}`)
                .send({str_field: "new test value"})
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.equal(res.body.object_type, "test_object");
                    assert.equal(res.body.id, object.id);
                    assert.equal(res.body.created_at, object.created_at);
                    assert.ok(res.body.modified_at);
                    assert.equal(res.body.str_field, "new test value");
                    object = res.body;
                    done();
                });
        });

        it("should delete fields", done => {
            request(server)
                .put(`/v1/graph/${object.id}`)
                .send({delete_fields: ["str_field"]})
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.equal(res.body.object_type, "test_object");
                    assert.equal(res.body.id, object.id);
                    assert.equal(res.body.created_at, object.created_at);
                    assert.ok(res.body.modified_at);
                    assert.equal(res.body.str_field, undefined);
                    object = res.body;
                    done();
                });
        });

        it("should throw object doesn't exsit error", done => {
            request(server)
                .put("/v1/graph/incorrect-01")
                .send({})
                .expect(404, {
                    code: "ObjectNotExists",
                    message: "Object 'incorrect-01' doesn't exist"
                }, done);
        });

        it("should throw incorrect object id error", done => {
            request(server)
                .put("/v1/graph/incorrect_id")
                .send({})
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'incorrect_id'"
                }, done);
        });
    });

    describe("Delete object", () => {
        it("should delete object", done => {
            request(server)
                .delete(`/v1/graph/${object.id}`)
                .expect(200, done);
        });

        it("should throw object doesn't exsit error", done => {
            request(server)
                .delete("/v1/graph/incorrect-01")
                .send({})
                .expect(404, {
                    code: "ObjectNotExists",
                    message: "Object 'incorrect-01' doesn't exist"
                }, done);
        });

        it("should throw incorrect object id error", done => {
            request(server)
                .delete("/v1/graph/incorrect_id")
                .send({})
                .expect(400, {
                    code: "IncorrectObjectID",
                    message: "Incorrect object ID 'incorrect_id'"
                }, done);
        });
    });
});
