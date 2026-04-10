/**
 * Script to check and fix admin passwords
 * This will:
 * 1. Check if passwords are hashed
 * 2. Re-hash plain text passwords
 * 3. Show current admin accounts
 * 
 * Usage: node scripts/fixAdminPasswords.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixAdminPasswords() {
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
        
        // Get all admins
        const [admins] = await connection.execute('SELECT * FROM root_admin');
        
        if (admins.length === 0) {
            console.log('⚠️  No admin accounts found in database');
            console.log('Run: node scripts/initRootAdmin.js to create admin accounts\n');
            return;
        }
        
        console.log(`📋 Found ${admins.length} admin account(s):\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('ID | Username      | Role   | Branch                    | Password Status');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        for (const admin of admins) {
            const isHashed = admin.password && (
                admin.password.startsWith('$2a$') || 
                admin.password.startsWith('$2b$') || 
                admin.password.startsWith('$2y$')
            );
            
            const status = isHashed ? '✅ Hashed' : '❌ Plain Text';
            const branch = admin.branch || 'NULL';
            
            console.log(
                `${admin.id.toString().padEnd(2)} | ${admin.username.padEnd(12)} | ${(admin.role || 'BRANCH').padEnd(6)} | ${branch.padEnd(25)} | ${status}`
            );
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Check for plain text passwords
        const plainTextAdmins = admins.filter(admin => {
            const isHashed = admin.password && (
                admin.password.startsWith('$2a$') || 
                admin.password.startsWith('$2b$') || 
                admin.password.startsWith('$2y$')
            );
            return !isHashed;
        });
        
        if (plainTextAdmins.length > 0) {
            console.log(`⚠️  Found ${plainTextAdmins.length} admin(s) with plain text passwords\n`);
            console.log('🔧 Fixing passwords...\n');
            
            // Default passwords for known admins
            const defaultPasswords = {
                'root': 'root',
                'karmaveer': 'karmaveer',
                'Godoli': 'Godoli',
                'Krantismruti': 'Krantismruti',
                'karad': 'karad'
            };
            
            for (const admin of plainTextAdmins) {
                // Try to hash the existing password (if it's the default)
                const defaultPassword = defaultPasswords[admin.username] || admin.password;
                
                try {
                    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
                    await connection.execute(
                        'UPDATE root_admin SET password = ? WHERE id = ?',
                        [hashedPassword, admin.id]
                    );
                    console.log(`✅ Hashed password for: ${admin.username}`);
                } catch (err) {
                    console.error(`❌ Error hashing password for ${admin.username}:`, err.message);
                }
            }
            
            console.log('\n✅ Password fixing complete!\n');
        } else {
            console.log('✅ All passwords are properly hashed!\n');
        }
        
        // Test login for each admin
        console.log('🧪 Testing password verification...\n');
        const testPasswords = {
            'root': 'root',
            'karmaveer': 'karmaveer',
            'Godoli': 'Godoli',
            'Krantismruti': 'Krantismruti',
            'karad': 'karad'
        };
        
        for (const admin of admins) {
            const testPassword = testPasswords[admin.username] || admin.password;
            const [updatedAdmin] = await connection.execute(
                'SELECT password FROM root_admin WHERE id = ?',
                [admin.id]
            );
            
            if (updatedAdmin.length > 0) {
                const passwordMatch = await bcrypt.compare(testPassword, updatedAdmin[0].password);
                if (passwordMatch) {
                    console.log(`✅ ${admin.username}: Password verification successful`);
                } else {
                    console.log(`❌ ${admin.username}: Password verification failed`);
                }
            }
        }
        
        console.log('\n✅ All checks complete!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ Database connection closed');
        }
    }
}

// Run the script
fixAdminPasswords();



