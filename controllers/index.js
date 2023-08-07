const connection = require("../services/connectDB");
const moment = require('moment');

class mainController {
    static async test(req, res, next) {
        try {
            // console.log("This is request body: ", req.body);  // for testing purposes
            res.send("Success!");
        } catch (error) {
            res.error(error?.message || 'Test error');
        }
    }

    static async testProcedure(req, res, next) {
        connection.query("call banks_List()", [], function (err, result) {
            if (err) {
                // console.log("err:", err);  // for testing purposes
                res.error(err?.message || 'Test Procedure Error');
            } else {
                // console.log("results:", result);  // for testing purposes
                res.send(result);
            }
        });
    }

    static commandCenter = async (req, res, next) => {
        const { mode, path, newPath, file } = req.body.params;
        const params = req.body.params

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

    static async list(path, res) {

        console.log('THIS IS MAIN CONTROLLER LIST');

        connection.query(
            "call xxx_cms_List_old(?, @e)",
            [path],
            function (err, result) {
                if (err) {
                    // console.log("err:", err);
                    res.error(err?.message || 'List error')
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
                    res.error(err?.message || 'List error')
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

    static async uploadOld(req, res, next) {
        const files = req?.files;

        // console.log("CONTROLLER UPLOAD FILES: ", files);  // for testing purposes

        if (!files[0]) {
            // res.send("ERROR, NO FILE FOUND");
            // console.log('HERE');  // for testing purposes
            const err = {
                status: 400,
                code: "FILE_NOT_FOUND",
                message: "File not found"
            }
            return next(err)
        }

        const filename = files[0].originalname;
        const type = files[0].mimetype;
        const buffer = files[0].buffer;
        const size = files[0].size;
        const bufferBase64 = buffer.toString("base64");

        console.log("CONTROLLER UPLOAD BLOB: ", bufferBase64);  // for testing purposes

        connection.query(
            "call xxx_cms_UploadFile(?, ?, @e)",
            [12, bufferBase64],
            function (err, result) {
                if (err) {
                    console.log("err:", err);
                    next(err);
                } else {
                    res.status(201).json({
                        message: "Success upload file to DB",
                    });
                }
            }
        );
    }

    static async upload(req, res, next) {
        console.log('HERE is UPLOAD!');
        const files = req.files.files;  // I know it's ugly, but it's the most optimal form due to client-side request tampering. But hey, if it works, it works.
        const body = req.body
        const {siteId, parentId, isFolder, destination, parentIds, createdBy} = body
        const isPublished = false;
        const isDeleted = false;
        const dateFormat = ""  // TODO insert date format here
        const success = [];  // Container for file upload successes
        const fail = [];  // container for upload failure
        let result = null;

        /* Helper Functions Start */
        const prepareFiles = (files) => {
            const success = [];  // storage for successful file prep names
            const fail = [];  // storage for failed file prep names
            let result = [];
            let customIndex = 0;  // adds indexing to successful processed files
            files.forEach((file, index) => {
                const fileProcessing = processSingleFile(file);
                let filename = file?.originalname || `File number ${index + 1}`;  // name of the file OR by the file's upload order just in case it's undefined
                if(!fileProcessing) {  // if processing returns false
                    fail.push(filename);  // add the failed file to the pile of fails 
                }
                else {
                    file.index = customIndex;
                    success.push(filename)  // add successfully processed file's name to the pile of successes
                    result.push(fileProcessing)  // add successfully processed file to the pile of results to be sent to DB
                    customIndex++;
                } 
            });

            // if(result[0]) {  // checks if there's any entry in result array
            //     result = JSON.stringify(result);  // converts the whole result into a string to prepare for DB insertion
            // }
            // else {
            //     result = null;  // empties result variable as signal something went wrong. Just in case.
            // }

            return {success, fail, result};  // returns a collection of processed files and which ones are successful and fail, denoted by the filename
        }

        const processSingleFile = (file) => {
            const { originalname, mimetype, buffer, size, encoding } = file;  // extract properties out of the file
            
            if(!originalname || !mimetype || !buffer || !size || !encoding) {  // file properties check, if one of it is missing, is not valid file
                return false;  // returns false if one of the properties are incomplete
            }

            const bufferBase64 = buffer.toString("base64");  // encoding before inserting into DB as Long Blob
            
            const processedFile = {  // wrap the files as an object with short and concise property names
                name: originalname,
                type: mimetype,
                size: size,
                encoding: encoding,
                data: bufferBase64
            }
            return processedFile;
        }

        const addFileToDB = (args, callback) => {  // Depreciated
            const query = connection.query(
                "call xxx_cms_create(?, ?, ?, ?, ?, ?, ?, ?, ?, @e)",
                args,
                function(err, result) {
                    if (err) {
                        console.log("add file to db err:", err);
                        err.fileUploadSuccess = success;
                        err.fileUploadFail = fail;
                        return next(err);
                    }
                    else {
                        console.log('Success Upload Result: ', result);
                        return result;
                    }
                }
            )
        }
        /* Helper functions end */

        /* Query to upload file to DB. Single files only. For multiple files, do a loop */

        let argFiles = null;  // to be populated with processed files STRING, after properties being appropriated and its buffers encoded
        const args = JSON.stringify({
            siteId: siteId,
            parentId: parentId,
            parentIds: parentIds,
            path: destination,
            createdBy: createdBy,
            modifiedBy: createdBy,
            lastUpdateBy: createdBy,
            publishDate: false,
            modifiedDate: moment().format('YYYY-MM-DD hh:mm:ss'),
            isFolder: 0,
            isPublished: 0,
            isDeleted: 0
        });  // to be inserted as 'args' in addFileToDB function

        argFiles = prepareFiles(files);  // TODO add successful/fail check

        // console.log('This is BODY: ', req.body);
        console.log('This is ARGS: ', args);
        console.log('This is ARG FILES: ', argFiles);

        /* Insert DB Loop here */
        argFiles.result.forEach(argFile => {
            let connect = connection.query("call xxx_cms_create(?, ?)", [args, JSON.stringify(argFile)], function(err, result) {
                const filename = argFile.name
                if(err) {
                    console.log("Upload Failed, file:", filename);
                    console.log("Upload Failed, err:", err);
                    fail.push(filename)
                }
                else {
                    console.log('Upload Success; Result: ', filename);
                    result = result;
                    success.push(filename);
                }
            })
        });

        console.log('Upload RESULT: ', result);

        if(success[0]) {
            res.status(201).json({
                success: true,
                data: result
            })
        }

        // const testConnect = connection.query("call xxx_cms_create(?, ?)", [args, argFiles.result], function(err, result) {
        //     if(err) {
        //         console.log("Test Failed:", err);
        //                 err.fileUploadSuccess = success;
        //                 err.fileUploadFail = fail;
        //                 err.status = 500
        //                 err.message = 'IS FAIL'
        //                 return next(err);
        //     }
        //     else {
        //         console.log('Test Success; Result: ', result);
        //         res.status(201).json({
        //             success: true,
        //             data: result
        //         })
        //         return;
        //     }
        // })

        return ;  // cutoff for current testing

        

        if (!files[0]) {
            // res.send("ERROR, NO FILE FOUND");
            const err = {
                status: 400,
                code: "FILE_NOT_FOUND",
                message: "File not found"
            }
            return next(err)
        }
        else {
            if(!siteId) {
                const err = {
                    status: 400,
                    code: "INCOMPLETE_PARAMS",
                    message: "Incomplete parameters for uploading file(s)"
                }
                return next(err)
            }
            
            files.forEach(file => {
                let now = Date.now()
                let bufferBase64 = file.buffer.toString("base64");
                let args = [
                    siteId, parentId, parentIds, file.name, file.size, file.type, isFolder, destination, createdBy, now, bufferBase64  // lacks parent ID, parent IDs
                ]
                addFileToDB()
            });
        }
    }

    

    static async createFolder(req, res, next) {

    }

    static async testFetchImage(req, res, next) {

        console.log('This is the MAIN CONTROLLER TEST FETCH IMAGE');  // for testing purposes

        const data = connection.query(
            "SELECT * FROM cms_documents_data WHERE id = 2",
            function (err, result) {
                if (err) {
                    console.log("err:", err);
                    next(err);
                } else {

                    console.log('DATA: ', result[0].data);

                    res.send(`<img src="data:${"image/jpg"};base64,${result[0].data}" />`);

                    // res.status(200).json({
                    //     message: "Fetch Image success",
                    //     data: result
                    // });
                }
            }
        );
    }
}

module.exports = mainController;
