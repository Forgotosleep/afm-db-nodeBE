const connection = require("../services/connectDB");

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
        const params = req.body.param

        // console.log("This is CC PARAMS: ", req.body.params);  // for testing purposes

        switch (mode) {
            case "list":
                this.list(path, res);
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

    static async upload(req, res, next) {
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
