/**
 * Script to encrypt plain text admin passwords to bcrypt hashes
 * This will convert all plain text passwords in root_admin table to encrypted form
 * 
 * Usage: node scripts/encryptAdminPasswords.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function encryptAdminPasswords() {
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
            return;
        }
        
        console.log(`📋 Found ${admins.length} admin account(s)\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Checking password status...\n');
        
        let updatedCount = 0;
        let skippedCount = 0;
        
        for (const admin of admins) {
            // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
            const isHashed = admin.password && (
                admin.password.startsWith('$2a$') || 
                admin.password.startsWith('$2b$') || 
                admin.password.startsWith('$2y$')
            );
            
            if (isHashed) {
                console.log(`⏭️  ${admin.username.padEnd(15)} - Password already encrypted (skipped)`);
                skippedCount++;
                continue;
            }
            
            // Password is plain text, encrypt it
            console.log(`🔐 ${admin.username.padEnd(15)} - Encrypting password...`);
            
            try {
                // Hash the plain text password
                const hashedPassword = await bcrypt.hash(admin.password, 10);
                
                // Update in database
                await connection.execute(
                    'UPDATE root_admin SET password = ? WHERE id = ?',
                    [hashedPassword, admin.id]
                );
                
                console.log(`   ✅ Password encrypted successfully for: ${admin.username}`);
                updatedCount++;
            } catch (err) {
                console.error(`   ❌ Error encrypting password for ${admin.username}:`, err.message);
            }
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Encrypted: ${updatedCount} password(s)`);
        console.log(`   ⏭️  Skipped: ${skippedCount} password(s) (already encrypted)`);
        console.log(`   📝 Total: ${admins.length} admin account(s)\n`);
        
        // Verify encryption by testing login
        console.log('🧪 Verifying encryption (testing login)...\n');
        
        const testPasswords = {
            'root': 'root',
            'karmaveer': 'karmaveer',
            'Godoli': 'Godoli',
            'Krantismruti': 'Krantismruti',
            'karad': 'karad'
        };
        
        let verifiedCount = 0;
        
        for (const admin of admins) {
            const testPassword = testPasswords[admin.username] || admin.password;
            
            // Get updated password from database
            const [updatedAdmin] = await connection.execute(
                'SELECT password FROM root_admin WHERE id = ?',
                [admin.id]
            );
            
            if (updatedAdmin.length > 0) {
                const storedPassword = updatedAdmin[0].password;
                const isHashed = storedPassword && (
                    storedPassword.startsWith('$2a$') || 
                    storedPassword.startsWith('$2b$') || 
                    storedPassword.startsWith('$2y$')
                );
                
                if (isHashed) {
                    const passwordMatch = await bcrypt.compare(testPassword, storedPassword);
                    if (passwordMatch) {
                        console.log(`   ✅ ${admin.username.padEnd(15)} - Login test: SUCCESS`);
                        verifiedCount++;
                    } else {
                        console.log(`   ❌ ${admin.username.padEnd(15)} - Login test: FAILED (password mismatch)`);
                    }
                } else {
                    console.log(`   ⚠️  ${admin.username.padEnd(15)} - Password still in plain text`);
                }
            }
        }
        
        console.log(`\n✅ Verification complete: ${verifiedCount}/${admins.length} passwords verified\n`);
        console.log('🎉 All passwords have been encrypted successfully!');
        console.log('💡 You can now login using the same credentials (username/password)\n');
        
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
encryptAdminPasswords();



