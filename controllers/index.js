const connection = require("../services/connectDB");
const moment = require("moment");
const fs = require("fs");
const { FormData } = require("formdata-node");
const path = require("path");
const { Readable, Duplex } = require("stream");

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
            // case "list":  // depreciated, changed to listByIds
            //     this.list(path, res);
            //     break;

            case "listByIds":
                this.listByIds(params, res);
                break;

            case "createFolder":
                this.createFolder(params, res, next);
                break;

            case "rename":
                this.renameFile(params, res, next);
                break;

            case "move":
                this.moveFiles(params, res, next);
                break;

            case "copy":
                this.copyFiles(params, res, next);
                break;

            case "remove":
                this.deleteFiles(params, res, next);
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

        const query = connection.query(
            "call xxx_cms_List(?, ?, @e)",
            [params.siteId, params.parentId],
            function (err, result) {
                if (err) {
                    console.error("err:", err);
                    res.error(err?.message || "List error");
                } else {
                    // console.log("results:", result);  // for testing purposes

                    const data = {
                        result: result[0],
                    };

                    console.log(data);
                    // fs.writeFileSync('./tmp/data3.txt', data)
                    res.send(data);
                }
            }
        );
    }

    static async moveFiles(params, res, next) {}

    static async copyFiles(params, res, next) {}

    static async deleteFiles(params, res, next) {  // switches file's isDeleted flag to on
        /* Helper functions start */
        function finishingUp(success = [], fail = []) {
            // TODO Create an error handler logic for partial upload fails
            return res.status(201).json({
                success: true,
                message: "Folder/files successfully deleted",
                data: {success, fail}
            });
        }
        /* Helper functions end */

        try {
            if (!params.items[0]) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid params",
                });
            }

            const success = []; // storage for successful file prep names
            const fail = []; // storage for failed file prep names
            
            let fileIds = params.items  // file/folder IDs to be deleted

            fileIds.forEach((fileId, index) => {
                let connect = connection.query(
                    "call xxx_cms_remove(?)",
                    [fileId],
                    function (err, result) {
                        if (err) {
                            fail.push(fileId)
                            console.error("Folder/files deletion failed, err:", err);
                            next(err);
                        } else {
                            success.push(fileId)

                            if(index == fileIds.length - 1) {
                                return finishingUp(success, fail);
                            }
                        }
                    }
                );
            });
            return ;

        } catch (error) {
            if (!error.status) error.status = 500;
            next(error);
        }
    }

    static async createFolder(params, res, next) {
        try {
            // console.log('MAIN CONTROLLER createFolder params: ', params);

            /* Helper functions start */
            const prepareEmptyFile = (name) => {
                const emptyFile = {
                    // wrap the files as an object with short and concise property names
                    name: name,
                    type: 0,
                    size: 0,
                    encoding: 0,
                    data: 0,
                };
                return emptyFile;
            };

            function finishingUp() {
                // TODO Create an error handler logic for partial upload fails
                return res.status(201).json({
                    success: true,
                    message: "Folder successfully created",
                });
            }
            /* Helper functions end */

            const {
                name,
                siteId,
                parentId,
                destination,
                parentIds,
                createdBy,
            } = params;

            const args = {
                name: name,
                siteId: siteId,
                parentIds: parentIds,
                path: destination,
                createdBy: createdBy,
                modifiedBy: createdBy,
                lastUpdateBy: createdBy,
                publishDate: false,
                modifiedDate: moment().format("YYYY-MM-DD hh:mm:ss"),
                isFolder: 1,
                isPublished: 0,
                isDeleted: 0,
            }; // to be inserted as 'args'

            if (parentId) {
                args.parentId = parentId;
            } // avoid parentId null error on DB's SP

            let newFolder = prepareEmptyFile(name);

            // console.log('createFolder NEWFOLDER: ', newFolder);

            console.log(args);
            console.log(newFolder);

            let connect = connection.query(
                "call xxx_cms_create(?, ?, ?, ?)",
                [JSON.stringify(args), JSON.stringify(newFolder), 1, null],
                function (err, result) {
                    const foldername = newFolder.name;
                    if (err) {
                        console.error("Folder creation failed, err:", err);
                        next(err);
                    } else {
                        return finishingUp();
                    }
                }
            );
        } catch (error) {
            console.error(error);
            next(error);
        }
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
        // console.log("HERE is UPLOAD!");
        const files = req.files.files; // I know it's ugly, but it's the most optimal form due to client-side request tampering. But hey, if it works, it works.
        // console.log("HERE is UPLOAD FILES: ", files);
        const body = req.body;
        const { siteId, parentId, destination, parentIds, createdBy } = body;

        fs.writeFileSync('./tmp/data1.txt', JSON.stringify(body))
        fs.writeFileSync('./tmp/data2.txt', JSON.stringify(req.files))

        // console.log("HERE is UPLOAD BODY: ", body);

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
                message: "File(s) upload successful",
            });
        }
        /* Helper functions end */

        /* Query to upload file to DB. Single files only. For multiple files, do a loop */
        let argFiles = null; // to be populated with processed files STRING, after properties being appropriated and its buffers encoded
        const args = {
            siteId: siteId,
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
        }; // to be inserted as 'args' in addFileToDB function

        if (parentId && parentId !== "null" && parentId !== "false") {
            args.parentId = parentId;
        } // avoid parentId null error on DB's SP

        argFiles = prepareFiles(files); // TODO add successful/fail check

        // console.log("ARG FILES: ", argFiles);

        /* Insert DB Loop here */

        // fs.writeFileSync('./tmp/args.txt', JSON.stringify(args[0]))
        // fs.writeFileSync('./tmp/argsFile.txt', JSON.stringify(argFiles[0]))
        // fs.writeFileSync('./tmp/argFileData.txt', JSON.stringify(argFiles[0].data))

        // console.log(JSON.stringify(args[0]))
        // console.log(JSON.stringify(argFiles[0]))
        // console.log(JSON.stringify(argFiles[0].data))


        argFiles.result.forEach((argFile, index) => {
            // console.log("INDEX:", index);
            // console.log("ARGFILE BUFFER: ", argFile.data);
            // console.log(args);
            console.log(argFile.data);

            let connect = connection.query(
                "call xxx_cms_create(?, ?, ?, ?)",
                [
                    JSON.stringify(args),
                    JSON.stringify(argFile),
                    0,
                    argFile.data,
                ],
                function (err, result) {
                    const filename = argFile.name;
                    if (err) {
                        console.error("Upload Failed, err:", err);
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

    static async testFetchImage(req, res, next) {
        // console.log("This is the MAIN CONTROLLER TEST FETCH IMAGE"); // for testing purposes

        const data = connection.query(
            "SELECT * FROM cms_documents_data WHERE cms_document_id = 107",
            function (err, result) {
                if (err) {
                    console.error("err:", err);
                    next(err);
                } else {
                    // console.log("DATA: ", result[0].data);

                    let buffer = new Buffer.from(result[0].data, "base64");
                    // console.log("BUFFER: ", buffer);
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
            // console.log("DL Req URL: ", req.url);
            // console.log("DL Req QUERY: ", req.query);
            // console.log("DL Req BODY: ", req.body);

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

            const data = await connection.query(
                "call xxx_cms_FetchFile(?)",
                [parseInt(req.query.fileId)],
                (err, result) => {
                    if (err) {
                        console.error("err:", err);
                        next(err);
                    } else {
                        let dataFile = result[0][0];
                        // console.log("dataFile: ", dataFile);
                        let buffer = dataFile?.data;
                        let filename = dataFile?.name;

                        if (!buffer) {
                            // Returns error if file's content is NULL
                            return res.status(500).json({
                                success: false,
                                message: "Invalid file",
                            });
                        }

                        if (isPreview !== "false") {
                            /* Direct from stream, not file! */
                            const myReadableStream = bufferToStream(buffer);
                            myReadableStream.pipe(res); // can do this one too, similar to write & end

                            /* Alternative to pipe, if wanted to do with a trigger */
                            // myReadableStream.on("data", function (data) {
                            //     res.write(data);
                            // });

                            // myReadableStream.on("end", function () {
                            //     res.end();
                            // });
                        } else {
                            let newFile = createTempFile(buffer, filename);

                            let currentDir = path.resolve(".");
                            let pathToFile =
                                currentDir +
                                "/" +
                                newFile.slice(1, newFile.length);

                            res.download(pathToFile, (err) => {
                                // Sends 'physical' copy of the file, and deletes its source file afterwards
                                if (err) {
                                    console.error(err);
                                    next(err);
                                }
                                fs.unlink(pathToFile, (err) => {
                                    // when file is sent, delete the source
                                    if (err) {
                                        next(err);
                                    }
                                    res.end();
                                });
                            });
                        }
                    }
                }
            );
        } catch (error) {
            console.error(error);
            next(error);
        }
    }
}

module.exports = mainController;
