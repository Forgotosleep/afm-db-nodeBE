const multer = require("multer");

const maxUploadMB = 5;  // limits uploads to 5MB
const maxFileNumber = 3;  // limits number of files uploaded to 3 files
const storage = multer.memoryStorage();
const limits = { fileSize: maxUploadMB * 1024 * 1024 }

function uploadFile(req, res, next) {
    const upload = multer({storage, limits: limits}).array('files', maxFileNumber);

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            // console.log.apply('MULTER ERROR')  // for testing purposes
            err.status = 400;  // denotes bad request
            next(err);

        } else if (err) {
            // An unknown error occurred when uploading.
            // console.log.apply('NON-MULTER ERROR')  // for testing purposes
            next(err)
        }
        // Everything went fine. 
        next();
    })
}

module.exports = uploadFile;