/**
 * Script to update branch admin credentials from lowercase to capitalized
 * This will update:
 * - godoli -> Godoli
 * - krantismruti -> Krantismruti
 * 
 * Usage: node scripts/updateBranchAdminCredentials.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function updateBranchAdminCredentials() {
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
        
        // Mapping of old usernames to new usernames
        const updates = [
            { oldUsername: 'godoli', newUsername: 'Godoli', newPassword: 'Godoli', branch: 'Godoli, Satara' },
            { oldUsername: 'krantismruti', newUsername: 'Krantismruti', newPassword: 'Krantismruti', branch: 'Krantismruti, Satara' }
        ];
        
        console.log('🔄 Updating branch admin credentials...\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        for (const update of updates) {
            try {
                // Check if old account exists
                const [oldAccounts] = await connection.execute(
                    'SELECT * FROM root_admin WHERE username = ?',
                    [update.oldUsername]
                );
                
                // Check if new account already exists
                const [newAccounts] = await connection.execute(
                    'SELECT * FROM root_admin WHERE username = ?',
                    [update.newUsername]
                );
                
                if (oldAccounts.length > 0) {
                    const oldAccount = oldAccounts[0];
                    
                    if (newAccounts.length > 0) {
                        // New account exists, update it with new password
                        console.log(`⚠️  ${update.newUsername} already exists. Updating password...`);
                        const hashedPassword = await bcrypt.hash(update.newPassword, 10);
                        await connection.execute(
                            'UPDATE root_admin SET password = ?, branch = ? WHERE username = ?',
                            [hashedPassword, update.branch, update.newUsername]
                        );
                        console.log(`   ✅ Updated password for: ${update.newUsername}`);
                        
                        // Delete old account
                        await connection.execute(
                            'DELETE FROM root_admin WHERE username = ?',
                            [update.oldUsername]
                        );
                        console.log(`   ✅ Deleted old account: ${update.oldUsername}`);
                    } else {
                        // Update old account to new username and password
                        console.log(`🔄 Updating ${update.oldUsername} -> ${update.newUsername}...`);
                        const hashedPassword = await bcrypt.hash(update.newPassword, 10);
                        await connection.execute(
                            'UPDATE root_admin SET username = ?, password = ?, branch = ? WHERE username = ?',
                            [update.newUsername, hashedPassword, update.branch, update.oldUsername]
                        );
                        console.log(`   ✅ Updated: ${update.oldUsername} -> ${update.newUsername}`);
                    }
                } else if (newAccounts.length > 0) {
                    // Only new account exists, just update password
                    console.log(`🔄 ${update.newUsername} exists. Updating password...`);
                    const hashedPassword = await bcrypt.hash(update.newPassword, 10);
                    await connection.execute(
                        'UPDATE root_admin SET password = ?, branch = ? WHERE username = ?',
                        [hashedPassword, update.branch, update.newUsername]
                    );
                    console.log(`   ✅ Updated password for: ${update.newUsername}`);
                } else {
                    // Neither exists, create new account
                    console.log(`➕ Creating new account: ${update.newUsername}...`);
                    const hashedPassword = await bcrypt.hash(update.newPassword, 10);
                    await connection.execute(
                        'INSERT INTO root_admin (username, password, role, branch) VALUES (?, ?, ?, ?)',
                        [update.newUsername, hashedPassword, 'BRANCH', update.branch]
                    );
                    console.log(`   ✅ Created: ${update.newUsername}`);
                }
            } catch (err) {
                console.error(`   ❌ Error updating ${update.oldUsername}:`, err.message);
            }
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📋 Verifying updated accounts...\n');
        
        // Verify the accounts
        for (const update of updates) {
            const [accounts] = await connection.execute(
                'SELECT * FROM root_admin WHERE username = ?',
                [update.newUsername]
            );
            
            if (accounts.length > 0) {
                const account = accounts[0];
                const passwordMatch = await bcrypt.compare(update.newPassword, account.password);
                
                if (passwordMatch) {
                    console.log(`✅ ${update.newUsername}: Username and password verified`);
                } else {
                    console.log(`❌ ${update.newUsername}: Password verification failed`);
                }
            } else {
                console.log(`❌ ${update.newUsername}: Account not found`);
            }
        }
        
        console.log('\n✅ Update complete!');
        console.log('\n📝 Updated Credentials:');
        console.log('   Godoli: Username = Godoli, Password = Godoli');
        console.log('   Krantismruti: Username = Krantismruti, Password = Krantismruti\n');
        
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
updateBranchAdminCredentials();


