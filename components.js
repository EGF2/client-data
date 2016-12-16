"use strict";

/* eslint camelcase: 0 */

const request = require("request");
const fs = require("fs");
const yargs = require("yargs");
const bunyan = require("bunyan");
const uuid = require("node-uuid");

const argv = yargs
    .usage("Usage: $0 [options]")
    .help("h")
    .alias("h", "help")
    .options({
        c: {
            alias: "config",
            demand: true,
            describe: "url or path to config file",
            type: "string",
            coerce: path => new Promise((resolve, reject) => {
                if (path.startsWith("http")) {
                    return request(path, (err, resp, body) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(JSON.parse(body));
                    });
                }
                fs.readFile(path, "utf8", (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(JSON.parse(data));
                });
            })
        },
        i: {
            alias: "init",
            describe: "initialize storage schema",
            type: "boolean"
        }
    }).argv;

function init() {
    return argv.config.then(config => {
        module.exports.config = config;
        module.exports.logger = bunyan.createLogger({
            name: "client-data",
            level: config.log_level
        });

        const storage = require("./storage");
        return Promise.resolve()
            .then(() => argv.i ? storage.init() : true)
            .then(() => {
                if (argv.i && ("secret_organization" in config.graph)) {
                    const now = new Date();
                    let secretOrganization = {
                        id: `${uuid.v4()}-${config.graph.secret_organization.code}`,
                        object_type: "secret_organization",
                        created_at: now,
                        modified_at: now
                    };
                    return storage.createObject(secretOrganization)
                        .then(() => console.log(secretOrganization));
                }
            })
            .then(() => storage.checkDB())
            .then(() => {
                if (argv.i) {
                    process.exit(0);
                }
                return module.exports;
            });
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = {
    init
};
