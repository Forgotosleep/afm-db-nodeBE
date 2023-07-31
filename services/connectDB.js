var mysql = require("mysql");
let dbConfig = require('../configs/db')

let pool = mysql.createPool(dbConfig);

module.exports = pool;