const multer = require("multer");

const maxUploadMB = 5;  // limits uploads to 5MB
const maxFileNumber = 3;  // limits number of files uploaded to 3 files
const storage = multer.memoryStorage();
const limits = { fileSize: maxUploadMB * 1024 * 1024 }

function uploadFile(req, res, next) {
    // console.log('HERE is MULTER!');  // for testing purposes

    const upload = multer({storage, limits: limits}).fields([{name: 'files', maxCount: maxFileNumber}, {name: 'data', maxCount: maxFileNumber}]);

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            // console.log('MULTER ERROR')  // for testing purposes
            err.status = 400;  // denotes bad request
            return next(err);

        } else if (err) {
            // An unknown error occurred when uploading.
            // console.log('NON-MULTER ERROR')  // for testing purposes
            return next(err);
        }
        else {
            // Everything went fine. 
            // console.log('MULTER REQ PRINTER BODY: ', req.body);
            // console.log('MULTER REQ PRINTER FILES: ', req.files);
    
            return next();
        }
    })
}

module.exports = uploadFile;