/**
 * Script to check branch name matching between admin and students
 * This will help debug why Godoli admin can't see students
 * 
 * Usage: node scripts/checkBranchMatching.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkBranchMatching() {
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
        
        // Check Godoli admin
        console.log('📋 Checking Godoli Admin:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const [godoliAdmins] = await connection.execute(
            'SELECT * FROM root_admin WHERE LOWER(username) LIKE "%godoli%"'
        );
        
        if (godoliAdmins.length > 0) {
            godoliAdmins.forEach(admin => {
                console.log(`Username: "${admin.username}"`);
                console.log(`Role: ${admin.role}`);
                console.log(`Branch: "${admin.branch}"`);
                console.log(`Branch Length: ${admin.branch ? admin.branch.length : 0}`);
                console.log(`Branch (trimmed): "${admin.branch ? admin.branch.trim() : ''}"`);
                console.log(`Branch (lowercase): "${admin.branch ? admin.branch.toLowerCase() : ''}"`);
                console.log('---');
            });
        } else {
            console.log('❌ No Godoli admin found');
        }
        
        // Check students with Godoli branch
        console.log('\n📋 Checking Students with Godoli Branch:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const [godoliStudents] = await connection.execute(
            'SELECT admission_id, full_name, branch FROM admission_form WHERE LOWER(branch) LIKE "%godoli%"'
        );
        
        if (godoliStudents.length > 0) {
            console.log(`Found ${godoliStudents.length} student(s):\n`);
            godoliStudents.forEach(student => {
                console.log(`ID: ${student.admission_id}`);
                console.log(`Name: ${student.full_name}`);
                console.log(`Branch: "${student.branch}"`);
                console.log(`Branch Length: ${student.branch ? student.branch.length : 0}`);
                console.log(`Branch (trimmed): "${student.branch ? student.branch.trim() : ''}"`);
                console.log(`Branch (lowercase): "${student.branch ? student.branch.toLowerCase() : ''}"`);
                console.log('---');
            });
        } else {
            console.log('❌ No students found with Godoli branch');
        }
        
        // Test matching
        console.log('\n🧪 Testing Branch Matching:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (godoliAdmins.length > 0 && godoliStudents.length > 0) {
            const adminBranch = godoliAdmins[0].branch;
            const studentBranch = godoliStudents[0].branch;
            
            console.log(`Admin Branch: "${adminBranch}"`);
            console.log(`Student Branch: "${studentBranch}"`);
            console.log(`Exact Match: ${adminBranch === studentBranch}`);
            console.log(`Trimmed Match: ${adminBranch.trim() === studentBranch.trim()}`);
            console.log(`Case-Insensitive Match: ${adminBranch.toLowerCase().trim() === studentBranch.toLowerCase().trim()}`);
            
            // Test SQL query
            const [testQuery] = await connection.execute(
                'SELECT COUNT(*) as count FROM admission_form WHERE LOWER(TRIM(branch)) = LOWER(TRIM(?))',
                [adminBranch]
            );
            console.log(`\nSQL Query Result: ${testQuery[0].count} student(s) found with matching branch`);
        }
        
        // Show all unique branch names
        console.log('\n📋 All Unique Branch Names in Database:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const [allBranches] = await connection.execute(
            'SELECT DISTINCT branch FROM admission_form ORDER BY branch'
        );
        allBranches.forEach(b => {
            console.log(`"${b.branch}" (length: ${b.branch ? b.branch.length : 0})`);
        });
        
        console.log('\n✅ Check complete!\n');
        
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
checkBranchMatching();


