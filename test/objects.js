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
            let rand = Math.floor(Math.random() * (100 - 1)) + 1;
            request(server)
                .post("/v1/graph")
                .set("Content-Type", "application/json")
                .send({
                    object_type: "user",
                    name: {
                        given: "Mock",
                        family: "Mock"
                    },
                    email: `test${rand}@example.com`,
                    date_of_birth: new Date(),
                    system: "00000000-0000-1000-8000-000000000000-01"
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.equal(res.body.object_type, "user");
                    assert.ok(res.body.id);
                    assert.ok(res.body.created_at);
                    assert.ok(res.body.modified_at);
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
                    assert.equal(res.body.object_type, "user");
                    assert.equal(res.body.id, object.id);
                    assert.equal(res.body.created_at, object.created_at);
                    assert.equal(res.body.modified_at, object.modified_at);
                    done();
                });
        });

        it("should throw object doesn't exsit error", done => {
            request(server)
                .get("/v1/graph/incorrect-03")
                .expect(404, {
                    code: "ObjectNotExists",
                    message: "Object 'incorrect-03' doesn't exist"
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
                .send({email: "new@example.com"})
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.equal(res.body.object_type, "user");
                    assert.equal(res.body.id, object.id);
                    assert.equal(res.body.created_at, object.created_at);
                    assert.ok(res.body.modified_at);
                    assert.equal(res.body.email, "new@example.com");
                    object = res.body;
                    done();
                });
        });

        it("should delete fields", done => {
            request(server)
                .put(`/v1/graph/${object.id}`)
                .send({delete_fields: ["foo"]})
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.equal(res.body.object_type, "user");
                    assert.equal(res.body.id, object.id);
                    assert.equal(res.body.created_at, object.created_at);
                    assert.ok(res.body.modified_at);
                    assert.equal(res.body.foo, undefined);
                    object = res.body;
                    done();
                });
        });

        it("should throw object doesn't exsit error", done => {
            request(server)
                .put("/v1/graph/incorrect-03")
                .send({})
                .expect(404, {
                    code: "ObjectNotExists",
                    message: "Object 'incorrect-03' doesn't exist"
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
                .delete("/v1/graph/incorrect-03")
                .send({})
                .expect(404, {
                    code: "ObjectNotExists",
                    message: "Object 'incorrect-03' doesn't exist"
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
