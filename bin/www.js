const app = require('../app')
const pool = require('../services/connectDB')

const port = process.env.PORT || 4000;

/* Listener */
app.listen(port, () => {
    console.log(`Success! Your application is running on port ${port}.`);
});

/* DB connection test */
pool.query('SELECT 1 + 1 AS solution', function (error, results, fields) {
    if (error) throw error;
  console.log('The solution is: ', results[0].solution);
  console.log('iAFM Server is running!');
});
 
// pool.release();