"use strict";

const config = require("../components").config;
const kafka = require("kafka-node");
const client = new kafka.Client(
    config.kafka.hosts.join(","),
    config.kafka.client_id
);
const producer = new kafka.HighLevelProducer(client);

function init() {
    return new Promise((resolve, reject) => {
        producer.createTopics([config.kafka.topic],
            (err, data) => err ? reject(err): resolve(data));
    });
}

function sendEvent(event) {
    return new Promise((resolve, reject) => {
        producer.send([{
            topic: config.kafka.topic,
            messages: JSON.stringify(event)
        }], (err, data) => err ? reject(err): resolve(data));
    });
}

module.exports = {
    init,
    sendEvent
};
