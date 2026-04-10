/**
 * Script to test admin login
 * This will test login for all admin accounts
 * 
 * Usage: node scripts/testAdminLogin.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testAdminLogin() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'Music_dept',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Connected to database\n');
        
        // Test credentials
        const testAccounts = [
            { username: 'root', password: 'root' },
            { username: 'karmaveer', password: 'karmaveer' },
            { username: 'Godoli', password: 'Godoli' },
            { username: 'Krantismruti', password: 'Krantismruti' },
            { username: 'karad', password: 'karad' }
        ];
        
        console.log('🧪 Testing admin logins...\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Username      | Password      | Status');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        for (const account of testAccounts) {
            try {
                const [admins] = await connection.execute(
                    'SELECT * FROM root_admin WHERE username = ?',
                    [account.username]
                );
                
                if (admins.length === 0) {
                    console.log(`${account.username.padEnd(12)} | ${account.password.padEnd(12)} | ❌ User not found`);
                    continue;
                }
                
                const admin = admins[0];
                const isHashed = admin.password && (
                    admin.password.startsWith('$2a$') || 
                    admin.password.startsWith('$2b$') || 
                    admin.password.startsWith('$2y$')
                );
                
                let passwordMatch = false;
                
                if (isHashed) {
                    passwordMatch = await bcrypt.compare(account.password, admin.password);
                } else {
                    passwordMatch = admin.password === account.password;
                }
                
                if (passwordMatch) {
                    console.log(`${account.username.padEnd(12)} | ${account.password.padEnd(12)} | ✅ Success (${admin.role || 'BRANCH'})`);
                } else {
                    console.log(`${account.username.padEnd(12)} | ${account.password.padEnd(12)} | ❌ Password mismatch`);
                    console.log(`              |               |    Stored: ${isHashed ? 'Hashed' : 'Plain: ' + admin.password.substring(0, 20) + '...'}`);
                }
            } catch (err) {
                console.log(`${account.username.padEnd(12)} | ${account.password.padEnd(12)} | ❌ Error: ${err.message}`);
            }
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testAdminLogin();



