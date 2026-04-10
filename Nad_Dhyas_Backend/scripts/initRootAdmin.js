/**
 * Script to initialize all admin accounts (ROOT + 4 BRANCH admins)
 * Run this once to create all admin accounts with hashed passwords
 * 
 * Usage: node scripts/initRootAdmin.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const adminAccounts = [
    { username: 'root', password: 'root', role: 'ROOT', branch: null },
    { username: 'karmaveer', password: 'karmaveer', role: 'BRANCH', branch: 'Karmaveer Nagar Society' },
    { username: 'Godoli', password: 'Godoli', role: 'BRANCH', branch: 'Godoli, Satara' },
    { username: 'Krantismruti', password: 'Krantismruti', role: 'BRANCH', branch: 'Krantismruti, Satara' },
    { username: 'karad', password: 'karad', role: 'BRANCH', branch: 'Karad' }
];

async function initAdmins() {
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
        
        console.log('✅ Connected to database');
        
        // Create root_admin table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS root_admin (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('ROOT', 'BRANCH') NOT NULL DEFAULT 'BRANCH',
                branch VARCHAR(100) NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_role (role),
                INDEX idx_branch (branch)
            )
        `);
        
        console.log('✅ root_admin table ready');
        
        // Check if columns exist, if not add them (for existing tables)
        try {
            await connection.execute(`SELECT role FROM root_admin LIMIT 1`);
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️  Adding role and branch columns...');
                await connection.execute(`
                    ALTER TABLE root_admin 
                    ADD COLUMN role ENUM('ROOT', 'BRANCH') NOT NULL DEFAULT 'BRANCH',
                    ADD COLUMN branch VARCHAR(100) NULL
                `);
                await connection.execute(`CREATE INDEX IF NOT EXISTS idx_role ON root_admin(role)`);
                await connection.execute(`CREATE INDEX IF NOT EXISTS idx_branch ON root_admin(branch)`);
                console.log('✅ Columns added');
            }
        }
        
        // Create/update all admin accounts
        console.log('\n📝 Creating/updating admin accounts...\n');
        
        for (const account of adminAccounts) {
            const [existing] = await connection.execute(
                'SELECT * FROM root_admin WHERE username = ?',
                [account.username]
            );
            
            const hashedPassword = await bcrypt.hash(account.password, 10);
            
            if (existing.length > 0) {
                // Update existing admin
                await connection.execute(
                    'UPDATE root_admin SET password = ?, role = ?, branch = ? WHERE username = ?',
                    [hashedPassword, account.role, account.branch, account.username]
                );
                console.log(`✅ Updated: ${account.username} (${account.role})`);
            } else {
                // Create new admin
                await connection.execute(
                    'INSERT INTO root_admin (username, password, role, branch) VALUES (?, ?, ?, ?)',
                    [account.username, hashedPassword, account.role, account.branch]
                );
                console.log(`✅ Created: ${account.username} (${account.role})`);
            }
        }
        
        console.log('\n📋 Admin Accounts:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        adminAccounts.forEach(acc => {
            console.log(`   ${acc.role.padEnd(6)} | ${acc.username.padEnd(15)} | ${acc.branch || 'N/A'}`);
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n⚠️  All passwords are hashed. Please change passwords after first login!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ Database connection closed');
        }
    }
}

// Run the script
initAdmins();

