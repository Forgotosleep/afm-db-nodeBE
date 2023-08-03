/* Packages */
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs"); // Will be used to load TLS Certs
const helmet = require("helmet");
const cors = require("cors");
const route = require("./routes");
const uploadFile = require("./middlewares/multer");

/* Server Setup */
const app = express();
app.use(helmet()); // Helmet helps secure Express apps by setting HTTP response headers
app.disable("x-powered-by"); // Reduces Fingerprinting

/* CORS */
app.use(cors());

/* Body Parsers */
app.use(express.json()); // For parsing application.json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Integrate Multer by Middleware
app.use((req, res, next) => {
    uploadFile(req, res, next);
});

/* Test URL */
app.get("/", (req, res) => {
    res.send("Server's up!");
});

/* Routes Extension */
app.use("/", route);

/* Custom General Error Handler */
// Custom 404
app.use((err, req, res, next) => {
    if(err.code && err.message) {  // If custom error code AND message is found, proceed to func below
        next(err);
    }
    else {
        return res.status(404).json({  // If the URL is invalid, returns 404
            err_code: "NOT_FOUND",
            err_message:
                "Resource is unable to be located",
            err_fields: err.field
        });
    }
});

// Custom error handler
app.use((err, req, res, next) => {
    // console.error(err.stack); // for testing purposes
    if (err.code && err.message) {  // sends out the custom error code & message
        return res.status(err.status).json({
            err_code: err.code,
            err_message:
                err.message,
            err_fields: err.field
        });
    } else {
        return res.status(500).json({  // returns internal server error for everything else
            err_code: "INTERNAL_ERROR",
            err_message:
                "Internal Server Error. Please try again or contact the administration team",
            err_fields: err.field
        });
    }
});

module.exports = app;
