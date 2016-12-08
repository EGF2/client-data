"use strict";

const components = require("./components");

components.init().then(opt => {
    let server = require("./server").createServer();
    server.listen(opt.config.port, function() {
        opt.logger.info("client-data started");
    });
});
