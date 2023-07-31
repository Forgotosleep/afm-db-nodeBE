
const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: parseInt(process.env.DB_TIMEOUT),
    timezone: process.env.DB_TIMEZONE,
    connectionLimit: 10,
}

module.exports = dbConfig;
