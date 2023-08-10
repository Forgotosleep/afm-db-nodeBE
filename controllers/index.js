const connection = require("../services/connectDB");
const moment = require("moment");
const fs = require("fs");
const { FormData } = require("formdata-node");
const path = require("path");
const { Readable, Duplex } = require("stream");
// const { Blob } = require("fetch-blob")
// import { Blob } from "fetch-blob";
// const { createTemporaryBlob, createTemporaryFile } = require("fetch-blob/from")
// const { File } = require("fetch-blob/file.js")

class mainController {
    static async test(req, res, next) {
        try {
            // console.log("This is request body: ", req.body);  // for testing purposes
            res.send("Success!");
        } catch (error) {
            res.error(error?.message || "Test error");
        }
    }

    static async testProcedure(req, res, next) {
        connection.query("call banks_List()", [], function (err, result) {
            if (err) {
                // console.log("err:", err);  // for testing purposes
                res.error(err?.message || "Test Procedure Error");
            } else {
                // console.log("results:", result);  // for testing purposes
                res.send(result);
            }
        });
    }

    static commandCenter = async (req, res, next) => {
        const { mode, path, newPath, file } = req.body.params;
        const params = req.body.params;

        // console.log("This is CC PARAMS: ", req.body.params);  // for testing purposes

        switch (mode) {
            case "list":
                this.list(path, res);
                break;

            case "listByIds":
                this.listByIds(params, res);
                break;

            default:
                res.send("Invalid command");
                break;
        }
    };

    // static async list(path, res) {  // Depreciated, switched from using 'path' to 'parent ID'
    //     console.log("THIS IS MAIN CONTROLLER LIST");

    //     connection.query(
    //         "call xxx_cms_List_old(?, @e)",
    //         [path],
    //         function (err, result) {
    //             if (err) {
    //                 // console.log("err:", err);
    //                 res.error(err?.message || "List error");
    //             } else {
    //                 // console.log("results:", result);  // for testing purposes

    //                 const data = {
    //                     result: result[0],
    //                 };

    //                 res.send(data);
    //             }
    //         }
    //     );
    // }

    static async listByIds(params, res) {
        // console.log('THIS IS MAIN CONTROLLER LIST BY IDS');
        // console.log(params.siteId, params.parentId);

        // /* For testing purpoises */
        // res.send('success!')
        // return;

        const query = connection.query(
            "call xxx_cms_List(?, ?, @e)",
            [params.siteId, params.parentId],
            function (err, result) {
                if (err) {
                    console.log("err:", err);
                    res.error(err?.message || "List error");
                } else {
                    // console.log("results:", result);  // for testing purposes

                    const data = {
                        result: result[0],
                    };

                    res.send(data);
                }
            }
        );
    }

    // static async uploadOld(req, res, next) {  // Depreciated, switched to new SP with multiple files upload capability
    //     const files = req?.files;

    //     // console.log("CONTROLLER UPLOAD FILES: ", files);  // for testing purposes

    //     if (!files[0]) {
    //         // res.send("ERROR, NO FILE FOUND");
    //         // console.log('HERE');  // for testing purposes
    //         const err = {
    //             status: 400,
    //             code: "FILE_NOT_FOUND",
    //             message: "File not found",
    //         };
    //         return next(err);
    //     }

    //     const filename = files[0].originalname;
    //     const type = files[0].mimetype;
    //     const buffer = files[0].buffer;
    //     const size = files[0].size;
    //     const bufferBase64 = buffer.toString("base64");

    //     console.log("CONTROLLER UPLOAD BLOB: ", bufferBase64); // for testing purposes

    //     connection.query(
    //         "call xxx_cms_UploadFile(?, ?, @e)",
    //         [12, bufferBase64],
    //         function (err, result) {
    //             if (err) {
    //                 console.log("err:", err);
    //                 next(err);
    //             } else {
    //                 res.status(201).json({
    //                     message: "Success upload file to DB",
    //                 });
    //             }
    //         }
    //     );
    // }

    static async upload(req, res, next) {
        console.log("HERE is UPLOAD!");
        const files = req.files.files; // I know it's ugly, but it's the most optimal form due to client-side request tampering. But hey, if it works, it works.
        console.log("HERE is UPLOAD FILES: ", files);
        const body = req.body;
        const {
            siteId,
            parentId,
            isFolder,
            destination,
            parentIds,
            createdBy,
        } = body;

        /* Helper Functions Start */
        const prepareFiles = (files) => {
            const success = []; // storage for successful file prep names
            const fail = []; // storage for failed file prep names
            let result = [];
            let customIndex = 0; // adds indexing to successful processed files
            files.forEach((file, index) => {
                const fileProcessing = processSingleFile(file);
                let filename = file?.originalname || `File number ${index + 1}`; // name of the file OR by the file's upload order just in case it's undefined
                if (!fileProcessing) {
                    // if processing returns false
                    fail.push(filename); // add the failed file to the pile of fails
                } else {
                    file.index = customIndex;
                    success.push(filename); // add successfully processed file's name to the pile of successes
                    result.push(fileProcessing); // add successfully processed file to the pile of results to be sent to DB
                    customIndex++;
                }
            });

            return { success, fail, result }; // returns a collection of processed files and which ones are successful and fail, denoted by the filename
        };

        const processSingleFile = (file) => {
            const { originalname, mimetype, buffer, size, encoding } = file; // extract properties out of the file

            if (!originalname || !mimetype || !buffer || !size || !encoding) {
                // file properties check, if one of it is missing, is not valid file
                return false; // returns false if one of the properties are incomplete
            }

            const processedFile = {
                // wrap the files as an object with short and concise property names
                name: originalname,
                type: mimetype,
                size: size,
                encoding: encoding,
                data: buffer,
            };
            return processedFile;
        };

        function finishingUp() {
            // TODO Create an error handler logic for partial upload fails
            return res.status(201).json({
                success: true,
            });
        }
        /* Helper functions end */

        /* Query to upload file to DB. Single files only. For multiple files, do a loop */
        let argFiles = null; // to be populated with processed files STRING, after properties being appropriated and its buffers encoded
        const args = JSON.stringify({
            siteId: siteId,
            parentId: parentId,
            parentIds: parentIds,
            path: destination,
            createdBy: createdBy,
            modifiedBy: createdBy,
            lastUpdateBy: createdBy,
            publishDate: false,
            modifiedDate: moment().format("YYYY-MM-DD hh:mm:ss"),
            isFolder: 0,
            isPublished: 0,
            isDeleted: 0,
        }); // to be inserted as 'args' in addFileToDB function

        argFiles = prepareFiles(files); // TODO add successful/fail check

        console.log("ARG FILES: ", argFiles);

        /* Insert DB Loop here */
        argFiles.result.forEach((argFile, index) => {
            console.log("INDEX:", index);
            console.log("ARGFILE BUFFER: ", argFile.data);

            let connect = connection.query(
                "call xxx_cms_create(?, ?, ?)",
                [args, JSON.stringify(argFile), argFile.data],
                function (err, result) {
                    const filename = argFile.name;
                    if (err) {
                        console.log("Upload Failed, err:", err);
                    } else {
                        result = result;
                        if (index == argFiles.result.length - 1) {
                            return finishingUp();
                        }
                    }
                }
            );
        });

        return;
    }

    static async createFolder(req, res, next) {}

    static async testFetchImage(req, res, next) {
        console.log("This is the MAIN CONTROLLER TEST FETCH IMAGE"); // for testing purposes

        const data = connection.query(
            "SELECT * FROM cms_documents_data WHERE cms_document_id = 107",
            function (err, result) {
                if (err) {
                    console.log("err:", err);
                    next(err);
                } else {
                    console.log("DATA: ", result[0].data);

                    let buffer = new Buffer.from(result[0].data, "base64");
                    console.log("BUFFER: ", buffer);
                    let image = buffer.toString("base64");
                    // console.log('IMAGE: ', image);
                    //     const bufferBase64 = buffer.toString("base64");

                    res.send(
                        // Original
                        `<img src="data:${"image/jpg"};base64,${image}" />`
                    );

                    // res.send(
                    //     // Original 106
                    //     `<img src="data:${"image/jpg"};base64,${
                    //         result[0].data
                    //     }" />`
                    // );

                    // res.status(200).json({
                    //     message: "Fetch Image success",
                    //     data: result
                    // });
                }
            }
        );
    }

    static async download(req, res, next) {
        try {
            // unfinished prototype
            console.log("DL Req URL: ", req.url);
            console.log("DL Req QUERY: ", req.query);
            console.log("DL Req BODY: ", req.body);

            let isPreview = req.query?.preview;

            /* Helper function start */
            function createTempFile(blob, filename) {
                // Option A
                // saves to a local file first, then returns the path for access
                try {
                    let path = `./tmp/${filename}`;

                    if (fs.existsSync(path)) {
                        return path;
                    }

                    fs.writeFileSync(path, blob);
                    return path;
                } catch (error) {
                    console.error(error);
                }
            }

            function bufferToStream(myBuffer) {
                // Option B
                // buffer and stream exists in memory, not local storage
                // good behavior up until 10 MB files, destination must accept readable stream
                let tmp = new Duplex();
                tmp.push(myBuffer);
                tmp.push(null);
                return tmp;
            }
            /* Helper function end */

            console.log("DL to DB pre-connection");

            const data = await connection.query(
                "call xxx_cms_FetchFile(?)",
                [parseInt(req.query.fileId)],
                (err, result) => {
                    if (err) {
                        console.log("err:", err);
                        next(err);
                    } else {
                        console.log("ISE GEESE!!");

                        let dataFile = result[0][0];
                        console.log("dataFile: ", dataFile);
                        let buffer = dataFile.data;
                        let filename = dataFile.name;

                        if (isPreview !== "false") {
                            console.log("ISE PREEVIEW!!");

                            /* Direct from stream, not file! */
                            /* Option B */
                            const myReadableStream = bufferToStream(buffer);
                            // myReadableStream.pipe(res);

                            myReadableStream.on("data", function (data) {
                                res.write(data);
                            });

                            myReadableStream.on("end", function () {
                                res.end();
                            });

                        } else {
                            console.log("HERE!!");

                            // /* Option A */
                            let newFile = createTempFile(buffer, filename);

                            let currentDir = path.resolve(".");
                            let pathToFile =
                                currentDir +
                                "/" +
                                newFile.slice(1, newFile.length);

                            console.log(pathToFile);

                            res.download(pathToFile, (err) => {
                                if(err) {
                                    console.error(err);
                                    next(err);
                                }
                                fs.unlink(pathToFile, (err) => {
                                    if(err) {next(err)};
                                    res.end();
                                });
                            }); // Send 'physical' file


                            // let buffered = Buffer.from(buffer);

                            // let readStream = fs
                            //     .createReadStream(pathToFile)
                            //     // .pipe(res);
                            // // let readStream = fs.createReadStream(buffered).pipe(res);
                            // // let readStream = fs.createReadStream(myReadableStream).pipe(res);

                            // readStream.on("data", (data) => {
                            //     console.log("----------------------------");
                            //     console.log(data);
                            //     console.log("----------------------------");

                            //     res.write(data);

                            // });

                            // readStream.on("open", () => {
                            //     console.log("Stream Open..");
                            // });

                            // readStream.on("end", () => {
                            //     console.log("Stream closed..");
                            //     res.download(pathToFile);
                            //     fs.unlink(pathToFile, (err) => {
                            //         if(err) {next(err)};
                            //         res.end();
                            //     });
                            //     // return res.send("Success!");
                            // });
                        }
                    }
                }
            );
        } catch (error) {
            console.error(error);
            next(error);
        }
    }

    async fetchData(fileId) {
        // For testing purposes
        connection.query(
            "call xxx_cms_FetchFile(?)",
            [fileId],
            function (err, result) {
                if (err) console.log(err);
                else {
                    return result;
                }
            }
        );
    }

    static async writeFile(name, data) {
        // For testing purposes
        let result = await fs.writeFile(name, data, { encoding: "base64" });
        return result;
    }
}

module.exports = mainController;
