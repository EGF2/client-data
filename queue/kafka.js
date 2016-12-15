"use strict";

const config = require("../components").config;
const kafka = require("no-kafka");
var producer = new kafka.Producer({
    connectionString: config.kafka.hosts.join(","),
    clientId: config.kafka["client-id"]
});
const producerPromise = producer.init();

function sendEvent(event) {
    return producerPromise.then(() => {
        return producer.send({
            topic: config.kafka.topic,
            message: {
                value: JSON.stringify(event)
            }
        });
    });
}

module.exports = {
    sendEvent
};
