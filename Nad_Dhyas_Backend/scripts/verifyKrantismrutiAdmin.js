/**
 * Script to verify and update Krantismruti admin credentials
 * Ensures:
 * - Username: Krantismruti
 * - Password: Krantismruti
 * - Branch: Krantismruti, Satara
 * 
 * Usage: node scripts/verifyKrantismrutiAdmin.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function verifyKrantismrutiAdmin() {
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
        
        // Check if Krantismruti admin exists
        console.log('📋 Checking Krantismruti Admin...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const [admins] = await connection.execute(
            'SELECT * FROM root_admin WHERE LOWER(username) LIKE "%krantismruti%"'
        );
        
        if (admins.length > 0) {
            const admin = admins[0];
            console.log(`Found admin: ${admin.username}`);
            console.log(`Current Role: ${admin.role}`);
            console.log(`Current Branch: "${admin.branch || 'N/A'}"`);
            
            // Check password
            const passwordMatch = await bcrypt.compare('Krantismruti', admin.password);
            console.log(`Password matches "Krantismruti": ${passwordMatch ? '✅' : '❌'}`);
            
            // Check if needs update
            const needsUpdate = 
                admin.username !== 'Krantismruti' ||
                !passwordMatch ||
                admin.branch !== 'Krantismruti, Satara' ||
                admin.role !== 'BRANCH';
            
            if (needsUpdate) {
                console.log('\n🔄 Updating Krantismruti admin...');
                
                const hashedPassword = await bcrypt.hash('Krantismruti', 10);
                
                await connection.execute(
                    'UPDATE root_admin SET username = ?, password = ?, role = ?, branch = ? WHERE id = ?',
                    ['Krantismruti', hashedPassword, 'BRANCH', 'Krantismruti, Satara', admin.id]
                );
                
                console.log('✅ Updated Krantismruti admin');
            } else {
                console.log('\n✅ Krantismruti admin is correctly configured');
            }
        } else {
            // Create new admin
            console.log('➕ Creating Krantismruti admin...');
            const hashedPassword = await bcrypt.hash('Krantismruti', 10);
            
            await connection.execute(
                'INSERT INTO root_admin (username, password, role, branch) VALUES (?, ?, ?, ?)',
                ['Krantismruti', hashedPassword, 'BRANCH', 'Krantismruti, Satara']
            );
            
            console.log('✅ Created Krantismruti admin');
        }
        
        // Verify final state
        console.log('\n📋 Verifying Krantismruti Admin...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const [finalAdmins] = await connection.execute(
            'SELECT * FROM root_admin WHERE username = ?',
            ['Krantismruti']
        );
        
        if (finalAdmins.length > 0) {
            const admin = finalAdmins[0];
            const passwordMatch = await bcrypt.compare('Krantismruti', admin.password);
            
            console.log(`Username: ${admin.username} ${admin.username === 'Krantismruti' ? '✅' : '❌'}`);
            console.log(`Password: ${passwordMatch ? '✅' : '❌'}`);
            console.log(`Role: ${admin.role} ${admin.role === 'BRANCH' ? '✅' : '❌'}`);
            console.log(`Branch: "${admin.branch}" ${admin.branch === 'Krantismruti, Satara' ? '✅' : '❌'}`);
            
            if (admin.username === 'Krantismruti' && passwordMatch && admin.role === 'BRANCH' && admin.branch === 'Krantismruti, Satara') {
                console.log('\n✅ Krantismruti admin is correctly configured!');
            } else {
                console.log('\n❌ Krantismruti admin configuration has issues');
            }
        } else {
            console.log('❌ Krantismruti admin not found after update');
        }
        
        // Check branch table
        console.log('\n📋 Checking Branch Table...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        try {
            const [tableCheck] = await connection.execute(
                'SELECT COUNT(*) as count FROM krantismruti_satara_table'
            );
            console.log(`✅ krantismruti_satara_table exists with ${tableCheck[0].count} student(s)`);
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('⚠️  krantismruti_satara_table does not exist yet (will be created when first student registers)');
            } else {
                console.log(`❌ Error checking table: ${err.message}`);
            }
        }
        
        console.log('\n✅ Verification complete!');
        console.log('\n📝 Krantismruti Admin Credentials:');
        console.log('   Username: Krantismruti');
        console.log('   Password: Krantismruti');
        console.log('   Branch: Krantismruti, Satara\n');
        
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
verifyKrantismrutiAdmin();


