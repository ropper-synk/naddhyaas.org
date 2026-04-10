const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Music_dept',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test database connection (non-fatal: server keeps running if this fails)
pool.getConnection()
    .then(connection => {
        console.log('✅ MySQL Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection error:', err.message);
        console.error('Please check your database credentials in .env file');
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('   1. Verify DB_USER, DB_PASSWORD, DB_HOST, DB_NAME in .env file');
        console.error('   2. Check if MySQL user has proper permissions');
        console.error('   3. For remote databases, ensure user can connect from your IP');
        console.error('   4. Run: node test-db-connection.js for detailed diagnostics');
        console.error('');
        // Swallow the error so it does not become an unhandled rejection and crash the process
    });

module.exports = pool;

