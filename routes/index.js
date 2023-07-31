/* Routes setup */
const express = require("express");
const route = express.Router();
const controller = require("../controllers");

/* List routes here */
route.get("/test", controller.test);
route.get("/test-image", controller.testFetchImage);
route.get("/test-procedure", controller.testProcedure);

route.post("/cms", controller.commandCenter);

route.post("/upload", controller.upload);

module.exports = route;