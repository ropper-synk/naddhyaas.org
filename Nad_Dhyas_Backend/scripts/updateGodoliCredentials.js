/**
 * Quick script to update Godoli admin credentials
 * This will update godoli -> Godoli (username and password)
 * 
 * Usage: node scripts/updateGodoliCredentials.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function updateGodoliCredentials() {
    let connection;
    
    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'Music_dept',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Connected to database\n');
        
        // Check if old account exists
        const [oldAccounts] = await connection.execute(
            'SELECT * FROM root_admin WHERE username = ?',
            ['godoli']
        );
        
        // Check if new account exists
        const [newAccounts] = await connection.execute(
            'SELECT * FROM root_admin WHERE username = ?',
            ['Godoli']
        );
        
        if (oldAccounts.length > 0) {
            const oldAccount = oldAccounts[0];
            console.log(`📋 Found old account: godoli`);
            
            if (newAccounts.length > 0) {
                // New account exists, update it and delete old
                console.log(`⚠️  Godoli already exists. Updating password...`);
                const hashedPassword = await bcrypt.hash('Godoli', 10);
                await connection.execute(
                    'UPDATE root_admin SET password = ?, branch = ? WHERE username = ?',
                    [hashedPassword, 'Godoli, Satara', 'Godoli']
                );
                console.log(`   ✅ Updated password for: Godoli`);
                
                // Delete old account
                await connection.execute(
                    'DELETE FROM root_admin WHERE username = ?',
                    ['godoli']
                );
                console.log(`   ✅ Deleted old account: godoli`);
            } else {
                // Update old account to new username and password
                console.log(`🔄 Updating godoli -> Godoli...`);
                const hashedPassword = await bcrypt.hash('Godoli', 10);
                await connection.execute(
                    'UPDATE root_admin SET username = ?, password = ?, branch = ? WHERE username = ?',
                    ['Godoli', hashedPassword, 'Godoli, Satara', 'godoli']
                );
                console.log(`   ✅ Updated: godoli -> Godoli`);
            }
        } else if (newAccounts.length > 0) {
            // Only new account exists, just update password
            console.log(`🔄 Godoli exists. Updating password...`);
            const hashedPassword = await bcrypt.hash('Godoli', 10);
            await connection.execute(
                'UPDATE root_admin SET password = ?, branch = ? WHERE username = ?',
                [hashedPassword, 'Godoli, Satara', 'Godoli']
            );
            console.log(`   ✅ Updated password for: Godoli`);
        } else {
            // Neither exists, create new account
            console.log(`➕ Creating new account: Godoli...`);
            const hashedPassword = await bcrypt.hash('Godoli', 10);
            await connection.execute(
                'INSERT INTO root_admin (username, password, role, branch) VALUES (?, ?, ?, ?)',
                ['Godoli', hashedPassword, 'BRANCH', 'Godoli, Satara']
            );
            console.log(`   ✅ Created: Godoli`);
        }
        
        // Verify the account
        console.log('\n📋 Verifying account...\n');
        const [verifyAccounts] = await connection.execute(
            'SELECT * FROM root_admin WHERE username = ?',
            ['Godoli']
        );
        
        if (verifyAccounts.length > 0) {
            const account = verifyAccounts[0];
            const passwordMatch = await bcrypt.compare('Godoli', account.password);
            
            if (passwordMatch) {
                console.log(`✅ Godoli: Username and password verified`);
                console.log(`   Username: ${account.username}`);
                console.log(`   Role: ${account.role}`);
                console.log(`   Branch: ${account.branch}`);
            } else {
                console.log(`❌ Godoli: Password verification failed`);
            }
        } else {
            console.log(`❌ Godoli: Account not found`);
        }
        
        console.log('\n✅ Update complete!');
        console.log('\n📝 Login Credentials:');
        console.log('   Username: Godoli');
        console.log('   Password: Godoli\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('✅ Database connection closed');
        }
    }
}

// Run the script
updateGodoliCredentials();


