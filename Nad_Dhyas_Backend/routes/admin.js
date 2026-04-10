const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// ==========================================
// Root Admin Login
// ==========================================
router.post('/login', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }
        
        // Ensure root_admin table exists with role and branch columns
        try {
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
            
            // Check if columns exist, if not add them (for existing tables)
            try {
                await connection.execute(`SELECT role FROM root_admin LIMIT 1`);
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    // Add role and branch columns if they don't exist
                    await connection.execute(`
                        ALTER TABLE root_admin 
                        ADD COLUMN role ENUM('ROOT', 'BRANCH') NOT NULL DEFAULT 'BRANCH',
                        ADD COLUMN branch VARCHAR(100) NULL
                    `);
                    await connection.execute(`
                        CREATE INDEX idx_role ON root_admin(role)
                    `);
                    await connection.execute(`
                        CREATE INDEX idx_branch ON root_admin(branch)
                    `);
                }
            }
        } catch (err) {
            console.error('Error setting up root_admin table:', err);
        }
        
        // Authenticate user - try exact match first, then case-insensitive
        let [admins] = await connection.execute(
            'SELECT * FROM root_admin WHERE username = ?',
            [username]
        );
        
        // If not found, try case-insensitive match (for transition period)
        if (admins.length === 0) {
            [admins] = await connection.execute(
                'SELECT * FROM root_admin WHERE LOWER(username) = LOWER(?)',
                [username]
            );
        }
        
        if (admins.length === 0) {
            console.log(`Login failed: Username '${username}' not found`);
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }
        
        const admin = admins[0];
        
        // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
        const isHashed = admin.password && (
            admin.password.startsWith('$2a$') || 
            admin.password.startsWith('$2b$') || 
            admin.password.startsWith('$2y$')
        );
        
        let passwordMatch = false;
        
        if (isHashed) {
            // Password is hashed, compare using bcrypt
            // Try exact password first
            passwordMatch = await bcrypt.compare(password, admin.password);
            
            // If exact match fails, try case variations for transition (Godoli/godoli)
            if (!passwordMatch && (admin.username.toLowerCase() === 'godoli' || admin.username.toLowerCase() === 'krantismruti')) {
                // Try lowercase version
                passwordMatch = await bcrypt.compare(password.toLowerCase(), admin.password);
                // Try capitalized version
                if (!passwordMatch && password.length > 0) {
                    const capitalizedPassword = password.charAt(0).toUpperCase() + password.slice(1).toLowerCase();
                    passwordMatch = await bcrypt.compare(capitalizedPassword, admin.password);
                }
            }
        } else {
            // Password is plain text (legacy), compare directly (case-insensitive for transition)
            const storedPasswordLower = admin.password.toLowerCase();
            const providedPasswordLower = password.toLowerCase();
            
            if (storedPasswordLower === providedPasswordLower) {
                passwordMatch = true;
                // Update password to hashed version with correct capitalization
                try {
                    // Use the provided password (with correct case) for hashing
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await connection.execute(
                        'UPDATE root_admin SET password = ? WHERE id = ?',
                        [hashedPassword, admin.id]
                    );
                    console.log(`Password hashed for user: ${username}`);
                } catch (hashErr) {
                    console.error('Error hashing password:', hashErr);
                }
            }
        }
        
        if (!passwordMatch) {
            console.log(`Login failed: Password mismatch for user '${username}'`);
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }
        
        // Successful login - return admin info including role and branch
        console.log(`[ADMIN LOGIN] User: ${admin.username}, Role: ${admin.role || 'BRANCH'}, Branch: "${admin.branch || 'N/A'}"`);
        res.json({
            success: true,
            message: 'Login successful',
            admin: {
                id: admin.id,
                username: admin.username,
                role: admin.role || 'BRANCH',
                branch: admin.branch || null
            }
        });
        
    } catch (error) {
        console.error('Admin Login Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Login failed'
        });
    } finally {
        connection.release();
    }
});

// ==========================================
// Helper: Get admin from session/request
// ==========================================
async function getAdminFromRequest(req, connection) {
    // Get admin info from request body or headers
    const adminId = req.body?.adminId || req.headers['x-admin-id'];
    const adminUsername = req.body?.adminUsername || req.headers['x-admin-username'];
    
    if (!adminId && !adminUsername) {
        return null;
    }
    
    let query = 'SELECT * FROM root_admin WHERE ';
    const params = [];
    
    if (adminId) {
        query += 'id = ?';
        params.push(adminId);
    } else {
        // Try exact match first, then case-insensitive
        query += 'username = ?';
        params.push(adminUsername);
    }
    
    let [admins] = await connection.execute(query, params);
    
    // If not found and username provided, try case-insensitive
    if (admins.length === 0 && adminUsername) {
        query = 'SELECT * FROM root_admin WHERE LOWER(username) = LOWER(?)';
        [admins] = await connection.execute(query, [adminUsername]);
    }
    
    if (admins.length > 0) {
        const admin = admins[0];
        console.log(`[getAdminFromRequest] Found admin: ${admin.username}, Role: ${admin.role}, Branch: "${admin.branch}"`);
        return admin;
    }
    
    return null;
}

// ==========================================
// Get All Student Records (with role-based access)
// ==========================================
router.post('/students', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { branch, search, adminId, adminUsername, adminRole, adminBranch } = req.body;
        
        // Get admin info from request body - ALWAYS get from database for accurate branch info
        let admin = null;
        if (adminId || adminUsername) {
            admin = await getAdminFromRequest(req, connection);
            if (admin) {
                console.log(`[STUDENTS API] Admin retrieved from DB: ${admin.username}, Role: ${admin.role}, Branch: "${admin.branch}"`);
            }
        }
        
        // If admin not found in DB but adminRole provided, try to get from DB using adminUsername
        if (!admin && adminRole && adminUsername) {
            // Try case-insensitive lookup
            const [admins] = await connection.execute(
                'SELECT * FROM root_admin WHERE LOWER(username) = LOWER(?)',
                [adminUsername]
            );
            if (admins.length > 0) {
                admin = admins[0];
                console.log(`[STUDENTS API] Admin found via case-insensitive lookup: ${admin.username}, Branch: "${admin.branch}"`);
            }
        }
        
        // Last resort: use provided adminRole and adminBranch (but this is less reliable)
        if (!admin && adminRole) {
            admin = {
                role: adminRole,
                branch: adminBranch || null
            };
            console.log(`[STUDENTS API] Using provided adminRole: ${adminRole}, Branch: "${adminBranch}"`);
        }
        
        if (!admin) {
            console.log(`[STUDENTS API] No admin found - adminId: ${adminId}, adminUsername: ${adminUsername}, adminRole: ${adminRole}`);
            return res.status(401).json({
                success: false,
                error: 'Admin authentication required'
            });
        }
        
        // Ensure admin has branch if it's a BRANCH admin
        if (admin.role === 'BRANCH' && !admin.branch) {
            console.log(`[STUDENTS API] WARNING: BRANCH admin ${admin.username} has no branch assigned!`);
        }
        
        // Build query with optional filters
        // For BRANCH admins, query from branch-specific tables if they exist
        let query = '';
        const params = [];
        
        if (admin && admin.role === 'BRANCH' && admin.branch) {
            // Get branch-specific table name
            const branchTableName = getBranchTableName(admin.branch);
            const branchMusicPrefsTable = getBranchMusicPrefsTable(admin.branch);
            const branchDonationFeeTable = getBranchDonationFeeTable(admin.branch);
            
            console.log(`[BRANCH ADMIN] Admin branch: "${admin.branch}"`);
            console.log(`[BRANCH ADMIN] Branch table: ${branchTableName || 'N/A'}`);
            console.log(`[BRANCH ADMIN] Music prefs table: ${branchMusicPrefsTable || 'music_preferences'}`);
            console.log(`[BRANCH ADMIN] Donation fee table: ${branchDonationFeeTable || 'donation_fee'}`);
            
            if (branchTableName) {
                // Query from branch-specific table (where students are stored when they select this branch)
                // Build query with branch-specific tables
                const musicTable = branchMusicPrefsTable || 'music_preferences';
                const donationTable = branchDonationFeeTable || 'donation_fee';
                
                query = `
                    SELECT 
                        af.admission_id,
                        af.branch,
                        af.admission_date,
                        af.full_name,
                        af.address,
                        af.phone,
                        af.date_of_birth,
                        af.age,
                        af.email_id,
                        af.form_no,
                        mp.instrumental_selection,
                        mp.indian_classical_vocal,
                        mp.dance,
                        mp.education_job_details,
                        mp.joining_date,
                        mp.diploma_admission_year,
                        MAX(df.payment_type) as payment_type,
                        MAX(df.transaction_id) as transaction_id,
                        COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0) as amount_paid,
                        MAX(df.donation_id) as donation_id,
                        CASE 
                            WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                            WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                            WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                            ELSE 10200
                        END as total_fee,
                        CASE 
                            WHEN mp.diploma_admission_year = 'First Year' THEN 10200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                            WHEN mp.diploma_admission_year = 'Second Year' THEN 10200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                            WHEN mp.diploma_admission_year = 'Third Year' THEN 12200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                            ELSE 10200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                        END as remaining_fee
                    FROM ${branchTableName} af
                    LEFT JOIN ${musicTable} mp ON af.admission_id = mp.admission_id
                    LEFT JOIN ${donationTable} df ON af.admission_id = df.admission_id
                    WHERE 1=1
                    GROUP BY af.admission_id, af.branch, af.admission_date, af.full_name, af.address, af.phone, af.date_of_birth, af.age, af.email_id, af.form_no, mp.instrumental_selection, mp.indian_classical_vocal, mp.dance, mp.education_job_details, mp.joining_date, mp.diploma_admission_year
                `;
                // No need for branch filter - branch table already contains only that branch's students
                console.log(`[BRANCH ADMIN] Querying from branch-specific table: ${branchTableName}`);
                console.log(`[BRANCH ADMIN] Using music table: ${musicTable}, donation table: ${donationTable}`);
            } else {
                // Fallback to main table if branch table doesn't exist
                query = `
                    SELECT 
                        af.admission_id,
                        af.branch,
                        af.admission_date,
                        af.full_name,
                        af.address,
                        af.phone,
                        af.date_of_birth,
                        af.age,
                        af.email_id,
                        af.form_no,
                        mp.instrumental_selection,
                        mp.indian_classical_vocal,
                        mp.dance,
                        mp.education_job_details,
                        mp.joining_date,
                        mp.diploma_admission_year,
                        MAX(df.payment_type) as payment_type,
                        MAX(df.transaction_id) as transaction_id,
                        COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0) as amount_paid,
                        MAX(df.donation_id) as donation_id,
                        CASE 
                            WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                            WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                            WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                            ELSE 10200
                        END as total_fee,
                        CASE 
                            WHEN mp.diploma_admission_year = 'First Year' THEN 10200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                            WHEN mp.diploma_admission_year = 'Second Year' THEN 10200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                            WHEN mp.diploma_admission_year = 'Third Year' THEN 12200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                            ELSE 10200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                        END as remaining_fee
                    FROM admission_form af
                    LEFT JOIN music_preferences mp ON af.admission_id = mp.admission_id
                    LEFT JOIN donation_fee df ON af.admission_id = df.admission_id
                    WHERE 1=1
                `;
                // Use flexible matching
                const adminBranchLower = admin.branch.toLowerCase().trim();
                const branchName = adminBranchLower.split(',')[0].trim();
                query += ' AND (LOWER(TRIM(af.branch)) = LOWER(TRIM(?)) OR LOWER(TRIM(af.branch)) LIKE ?)';
                params.push(admin.branch);
                params.push(`%${branchName}%`);
                query += ' GROUP BY af.admission_id, af.branch, af.admission_date, af.full_name, af.address, af.phone, af.date_of_birth, af.age, af.email_id, af.form_no, mp.instrumental_selection, mp.indian_classical_vocal, mp.dance, mp.education_job_details, mp.joining_date, mp.diploma_admission_year';
            }
        } else {
            // ROOT admin or no branch filter - use main table
            query = `
                SELECT 
                    af.admission_id,
                    af.branch,
                    af.admission_date,
                    af.full_name,
                    af.address,
                    af.phone,
                    af.date_of_birth,
                    af.age,
                    af.email_id,
                    af.form_no,
                    mp.instrumental_selection,
                    mp.indian_classical_vocal,
                    mp.dance,
                    mp.education_job_details,
                    mp.joining_date,
                    mp.diploma_admission_year,
                    MAX(df.payment_type) as payment_type,
                    MAX(df.transaction_id) as transaction_id,
                    COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0) as amount_paid,
                    MAX(df.donation_id) as donation_id,
                    CASE 
                        WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                        WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                        WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                        ELSE 10200
                    END as total_fee,
                    CASE 
                        WHEN mp.diploma_admission_year = 'First Year' THEN 10200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                        WHEN mp.diploma_admission_year = 'Second Year' THEN 10200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                        WHEN mp.diploma_admission_year = 'Third Year' THEN 12200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                        ELSE 10200 - COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0)
                    END as remaining_fee
                FROM admission_form af
                LEFT JOIN music_preferences mp ON af.admission_id = mp.admission_id
                LEFT JOIN donation_fee df ON af.admission_id = df.admission_id
                WHERE 1=1
            `;
            
            if (branch && branch !== 'all') {
                // ROOT admin can filter by branch if provided
                query += ' AND af.branch = ?';
                params.push(branch);
            }
            query += ' GROUP BY af.admission_id, af.branch, af.admission_date, af.full_name, af.address, af.phone, af.date_of_birth, af.age, af.email_id, af.form_no, mp.instrumental_selection, mp.indian_classical_vocal, mp.dance, mp.education_job_details, mp.joining_date, mp.diploma_admission_year';
        }
        
        // Debug: Log the final query for branch admins
        if (admin && admin.role === 'BRANCH') {
            console.log(`[BRANCH ADMIN] Query filter: LOWER(TRIM(af.branch)) = LOWER(TRIM("${admin.branch}"))`);
        }
        
        // Search by name, email, or transaction ID - must be added before GROUP BY
        if (search) {
            // Remove GROUP BY temporarily if it exists, add search, then re-add GROUP BY
            if (query.includes('GROUP BY')) {
                const groupByIndex = query.indexOf('GROUP BY');
                const groupByClause = query.substring(groupByIndex);
                query = query.substring(0, groupByIndex).trim();
                query += ' AND (af.full_name LIKE ? OR af.email_id LIKE ? OR df.transaction_id LIKE ?)';
                query += ' ' + groupByClause;
            } else {
                query += ' AND (af.full_name LIKE ? OR af.email_id LIKE ? OR df.transaction_id LIKE ?)';
            }
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }
        
        // Add ORDER BY at the end (after GROUP BY if present)
        query += ' ORDER BY af.admission_date DESC, af.admission_id DESC';
        
        // Debug logging for branch admins
        if (admin && admin.role === 'BRANCH') {
            console.log(`[BRANCH ADMIN] Executing query with ${params.length} parameter(s)`);
            console.log(`[BRANCH ADMIN] Parameters:`, params);
        }
        
        const [records] = await connection.execute(query, params);
        
        // Debug logging
        if (admin && admin.role === 'BRANCH') {
            console.log(`[BRANCH ADMIN] Found ${records.length} student record(s)`);
            if (records.length > 0) {
                console.log(`[BRANCH ADMIN] First student branch: "${records[0].branch}"`);
            } else {
                // Check if there are any students with similar branch names
                const [allBranches] = await connection.execute(
                    'SELECT DISTINCT branch FROM admission_form WHERE LOWER(branch) LIKE "%godoli%"'
                );
                console.log(`[BRANCH ADMIN] Students with "godoli" in branch name:`, allBranches.map(b => b.branch));
            }
        }
        
        res.json({
            success: true,
            data: records,
            count: records.length
        });
        
    } catch (error) {
        console.error('Error fetching student records:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch records'
        });
    } finally {
        connection.release();
    }
});

// ==========================================
// Get Dashboard Statistics (with role-based access)
// ==========================================
router.post('/stats', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { adminId, adminUsername, adminRole, adminBranch } = req.body;
        
        // Get admin info from request body
        let admin = null;
        if (adminId || adminUsername) {
            admin = await getAdminFromRequest(req, connection);
        }
        
        // If admin info provided via request body
        if (!admin && adminRole) {
            admin = {
                role: adminRole,
                branch: adminBranch || null
            };
        }
        
        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin authentication required'
            });
        }
        
        // For BRANCH admins, check if branch-specific tables exist
        let admissionTable = 'admission_form';
        let donationTable = 'donation_fee';
        let whereClause = '';
        const params = [];
        let useBranchTable = false;
        
        if (admin && admin.role === 'BRANCH' && admin.branch) {
            console.log(`[STATS API] 🔍 Branch Admin Query - Branch: "${admin.branch}"`);
            
            // Get branch-specific table name
            const branchTableName = getBranchTableName(admin.branch);
            const branchDonationFeeTable = getBranchDonationFeeTable(admin.branch);
            
            console.log(`[STATS API] Branch table lookup: ${branchTableName || 'NOT FOUND'}`);
            
            if (branchTableName) {
                // Use branch-specific tables
                admissionTable = branchTableName;
                donationTable = branchDonationFeeTable || 'donation_fee';
                useBranchTable = true;
                // No WHERE clause needed - branch table already contains only that branch's students
                whereClause = '';
                console.log(`[STATS API] ✅ Using branch-specific table: ${admissionTable}`);
            } else {
                // Fallback to main table with WHERE clause
                const adminBranchLower = admin.branch.toLowerCase().trim();
                const branchName = adminBranchLower.split(',')[0].trim();
                whereClause = 'WHERE (LOWER(TRIM(af.branch)) = LOWER(TRIM(?)) OR LOWER(TRIM(af.branch)) LIKE ?)';
                params.push(admin.branch);
                params.push(`%${branchName}%`);
                console.log(`[STATS API] ⚠️ Using main table with WHERE clause`);
                console.log(`[STATS API] Query params:`, params);
            }
        }
        
        // Debug: Show all branches in database (for branch admin with 0 students)
        if (admin && admin.role === 'BRANCH' && !useBranchTable) {
            try {
                const [allBranches] = await connection.execute(
                    `SELECT DISTINCT branch FROM admission_form WHERE branch IS NOT NULL ORDER BY branch`
                );
                console.log(`[STATS API] 📋 All branches in database:`, allBranches.map(b => b.branch));
            } catch (err) {
                console.log('[STATS API] Could not fetch branch list:', err.message);
            }
        }
        
        // Total students
        let totalStudentsQuery = `SELECT COUNT(*) as count FROM ${admissionTable} af ${whereClause}`;
        console.log(`[STATS API] 📊 Total students query: ${totalStudentsQuery}`);
        console.log(`[STATS API] 📊 Query params:`, params);
        const [totalStudents] = await connection.execute(totalStudentsQuery, params);
        console.log(`[STATS API] 📊 Total students result:`, totalStudents[0]);
        
        if (admin && admin.role === 'BRANCH' && totalStudents[0].count === 0) {
            console.log(`[STATS API] ⚠️ WARNING: No students found for branch "${admin.branch}"`);
            console.log(`[STATS API] 💡 Check if branch name matches exactly with database entries`);
        }
        
        // Total donations/fees collected
        const [totalFees] = await connection.execute(
            `SELECT COALESCE(SUM(COALESCE(df.amount_paid, 0)), 0) as total 
             FROM ${donationTable} df
             LEFT JOIN ${admissionTable} af ON df.admission_id = af.admission_id
             ${whereClause}`,
            params
        );
        
        // Calculate fee statistics for branch admin
        let totalExpectedFee = 0;
        let remainingFees = 0;
        let studentsWithRemainingFee = 0;
        
        if (admin && admin.role === 'BRANCH') {
            // For branch admin: calculate total expected fee based on year
            const musicTable = useBranchTable ? getBranchMusicPreferencesTable(admin.branch) : 'music_preferences';
            const [expectedFeeResult] = await connection.execute(
                `SELECT COALESCE(SUM(
                     CASE 
                         WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                         WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                         WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                         ELSE 10200
                     END
                 ), 0) as total_expected
                 FROM ${admissionTable} af
                 LEFT JOIN ${musicTable} mp ON af.admission_id = mp.admission_id
                 ${whereClause}`,
                params
            );
            totalExpectedFee = expectedFeeResult[0]?.total_expected || 0;
            const paidFees = totalFees[0]?.total || 0;
            remainingFees = Math.max(0, totalExpectedFee - paidFees);
            
            // Count students with remaining fees (year-based)
            const [remainingCount] = await connection.execute(
                `SELECT COUNT(DISTINCT af.admission_id) as count
                 FROM ${admissionTable} af
                 LEFT JOIN ${musicTable} mp ON af.admission_id = mp.admission_id
                 LEFT JOIN (
                     SELECT admission_id, COALESCE(SUM(COALESCE(amount_paid, 0)), 0) as total_paid
                     FROM ${donationTable}
                     GROUP BY admission_id
                 ) df ON af.admission_id = df.admission_id
                 ${whereClause ? whereClause + ' AND' : 'WHERE'} COALESCE(df.total_paid, 0) < CASE 
                     WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                     WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                     WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                     ELSE 10200
                 END`,
                params
            );
            studentsWithRemainingFee = remainingCount[0]?.count || 0;
        } else if (admin && admin.role === 'ROOT') {
            // For root admin: count students with remaining fees across all branches
            const [remainingCount] = await connection.execute(
                `SELECT COUNT(DISTINCT af.admission_id) as count
                 FROM ${admissionTable} af
                 LEFT JOIN music_preferences mp ON af.admission_id = mp.admission_id
                 LEFT JOIN (
                     SELECT admission_id, COALESCE(SUM(COALESCE(amount_paid, 0)), 0) as total_paid
                     FROM ${donationTable}
                     GROUP BY admission_id
                 ) df ON af.admission_id = df.admission_id
                 WHERE COALESCE(df.total_paid, 0) < CASE 
                     WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                     WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                     WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                     ELSE 10200
                 END`
            );
            studentsWithRemainingFee = remainingCount[0]?.count || 0;
        }
        
        // Students by branch (only show relevant branches)
        // Enhanced to include fee statistics with year-based fees
        const musicTableForStats = (admin && admin.role === 'BRANCH' && useBranchTable) 
            ? getBranchMusicPreferencesTable(admin.branch) 
            : 'music_preferences';
        
        let branchStatsQuery = `
            SELECT 
                af.branch,
                COUNT(*) as count,
                COALESCE(SUM(COALESCE(df.total_paid, 0)), 0) as total_fees,
                COALESCE(SUM(
                    CASE 
                        WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                        WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                        WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                        ELSE 10200
                    END
                ), 0) as total_expected_fee,
                COALESCE(SUM(
                    CASE 
                        WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                        WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                        WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                        ELSE 10200
                    END
                ), 0) - COALESCE(SUM(COALESCE(df.total_paid, 0)), 0) as remaining_fees,
                COUNT(CASE 
                    WHEN COALESCE(df.total_paid, 0) < CASE 
                        WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                        WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                        WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                        ELSE 10200
                    END THEN 1 
                END) as students_with_remaining_fee
            FROM ${admissionTable} af
            LEFT JOIN ${musicTableForStats} mp ON af.admission_id = mp.admission_id
            LEFT JOIN (
                SELECT admission_id, 
                       COALESCE(SUM(COALESCE(amount_paid, 0)), 0) as total_paid
                FROM ${donationTable}
                GROUP BY admission_id
            ) df ON af.admission_id = df.admission_id
        `;
        
        // Recent admissions (last 30 days) - calculate before branch stats
        let recentQuery = `SELECT COUNT(*) as count FROM ${admissionTable} af WHERE admission_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
        const recentParams = [];
        if (admin && admin.role === 'BRANCH' && admin.branch && !useBranchTable) {
            // Only add WHERE clause if using main table
            const adminBranchLower = admin.branch.toLowerCase().trim();
            const branchName = adminBranchLower.split(',')[0].trim();
            recentQuery += ' AND (LOWER(TRIM(af.branch)) = LOWER(TRIM(?)) OR LOWER(TRIM(af.branch)) LIKE ?)';
            recentParams.push(admin.branch);
            recentParams.push(`%${branchName}%`);
        }
        const [recentAdmissions] = await connection.execute(recentQuery, recentParams);
        
        if (admin && admin.role === 'BRANCH' && admin.branch) {
            // If using branch table, no WHERE clause needed (already filtered)
            if (!useBranchTable) {
                // Only add WHERE clause if using main table
                const adminBranchLower = admin.branch.toLowerCase().trim();
                const branchName = adminBranchLower.split(',')[0].trim();
                branchStatsQuery += ' WHERE (LOWER(TRIM(af.branch)) = LOWER(TRIM(?)) OR LOWER(TRIM(af.branch)) LIKE ?) GROUP BY af.branch';
                const [branchStats] = await connection.execute(branchStatsQuery, [admin.branch, `%${branchName}%`]);
                
                // Get class-wise stats for branch admin
                const classWiseQuery = `
                    SELECT 
                        COALESCE(mp.diploma_admission_year, 'Not Specified') as year,
                        COUNT(DISTINCT af.admission_id) as count
                    FROM ${admissionTable} af
                    LEFT JOIN music_preferences mp ON af.admission_id = mp.admission_id
                    WHERE (LOWER(TRIM(af.branch)) = LOWER(TRIM(?)) OR LOWER(TRIM(af.branch)) LIKE ?)
                    GROUP BY mp.diploma_admission_year
                    ORDER BY 
                        CASE 
                            WHEN mp.diploma_admission_year = 'First Year' THEN 1
                            WHEN mp.diploma_admission_year = 'Second Year' THEN 2
                            WHEN mp.diploma_admission_year = 'Third Year' THEN 3
                            ELSE 4
                        END
                `;
                const [classWiseStats] = await connection.execute(classWiseQuery, [admin.branch, `%${branchName}%`]);
                
                res.json({
                    success: true,
                    stats: {
                        totalStudents: totalStudents[0]?.count || 0,
                        totalFees: totalFees[0]?.total || 0,
                        totalExpectedFee: totalExpectedFee,
                        remainingFees: remainingFees,
                        studentsWithRemainingFee: studentsWithRemainingFee,
                        recentAdmissions: recentAdmissions[0]?.count || 0,
                        branchStats: branchStats,
                        classWiseStats: classWiseStats
                    }
                });
                connection.release();
                return;
            } else {
                branchStatsQuery += ' GROUP BY af.branch';
            }
        } else {
            branchStatsQuery += ' GROUP BY af.branch';
        }
        
        const [branchStats] = await connection.execute(branchStatsQuery, params);
        
        // Calculate students with remaining fees for root admin
        if (admin && admin.role === 'ROOT') {
            const [remainingCount] = await connection.execute(
                `SELECT COUNT(DISTINCT af.admission_id) as count
                 FROM ${admissionTable} af
                 LEFT JOIN (
                     SELECT admission_id, COALESCE(SUM(COALESCE(amount_paid, 0)), 0) as total_paid
                     FROM ${donationTable}
                     GROUP BY admission_id
                 ) df ON af.admission_id = df.admission_id
                 WHERE COALESCE(df.total_paid, 0) < 10000`
            );
            studentsWithRemainingFee = remainingCount[0]?.count || 0;
        }
        
        // Get class-wise (diploma year) student count
        const classWiseTable = (admin && admin.role === 'BRANCH' && useBranchTable) 
            ? getBranchMusicPreferencesTable(admin.branch) 
            : 'music_preferences';
        
        let classWiseQuery = `
            SELECT 
                COALESCE(mp.diploma_admission_year, 'Not Specified') as year,
                COUNT(DISTINCT af.admission_id) as count
            FROM ${admissionTable} af
            LEFT JOIN ${classWiseTable} mp ON af.admission_id = mp.admission_id
            ${whereClause}
            GROUP BY mp.diploma_admission_year
            ORDER BY 
                CASE 
                    WHEN mp.diploma_admission_year = 'First Year' THEN 1
                    WHEN mp.diploma_admission_year = 'Second Year' THEN 2
                    WHEN mp.diploma_admission_year = 'Third Year' THEN 3
                    ELSE 4
                END
        `;
        
        const [classWiseStats] = await connection.execute(classWiseQuery, params);
        
        res.json({
            success: true,
            stats: {
                totalStudents: totalStudents[0]?.count || 0,
                totalFees: totalFees[0]?.total || 0,
                totalExpectedFee: totalExpectedFee,
                remainingFees: remainingFees,
                studentsWithRemainingFee: studentsWithRemainingFee,
                recentAdmissions: recentAdmissions[0]?.count || 0,
                branchStats: branchStats,
                classWiseStats: classWiseStats
            }
        });
        
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch statistics'
        });
    } finally {
        connection.release();
    }
});

// ==========================================
// Update Student Record (ROOT and BRANCH admins - branch admins can edit only their branch)
// ==========================================
router.put('/students/:id', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const admissionId = parseInt(req.params.id);
        const data = req.body;

        if (isNaN(admissionId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid admission ID'
            });
        }

        // Get admin info
        const { adminId, adminUsername } = req.body;
        let admin = null;
        if (adminId || adminUsername) {
            admin = await getAdminFromRequest(req, connection);
        }

        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin authentication required'
            });
        }

        // Find student - could be in admission_form (main) or branch table
        let studentBranch = null;
        let mainAdmissionId = null;
        let branchAdmissionId = null;

        const [mainStudents] = await connection.execute(
            'SELECT admission_id, branch FROM admission_form WHERE admission_id = ?',
            [admissionId]
        );

        if (mainStudents.length > 0) {
            mainAdmissionId = mainStudents[0].admission_id;
            studentBranch = mainStudents[0].branch;
            const bt = getBranchTableName(studentBranch);
            if (bt) {
                const [branchRows] = await connection.execute(
                    `SELECT admission_id FROM ${bt} WHERE branch = ? AND full_name = (SELECT full_name FROM admission_form WHERE admission_id = ?) LIMIT 1`,
                    [studentBranch, admissionId]
                );
                if (branchRows.length > 0) branchAdmissionId = branchRows[0].admission_id;
            }
        } else {
            // admissionId might be from branch table - check branch tables
            const branchTables = [
                ['godoli_satara_table', 'Godoli'],
                ['karmaveer_nagar_table', 'Karmaveer'],
                ['krantismruti_satara_table', 'Krantismruti'],
                ['karad_table', 'Karad']
            ];
            for (const [tableName, branchKey] of branchTables) {
                try {
                    const [rows] = await connection.execute(
                        `SELECT admission_id, branch FROM ${tableName} WHERE admission_id = ?`,
                        [admissionId]
                    );
                    if (rows.length > 0) {
                        branchAdmissionId = rows[0].admission_id;
                        studentBranch = rows[0].branch;
                        const [mainRows] = await connection.execute(
                            `SELECT admission_id FROM admission_form WHERE branch = ? AND full_name = (SELECT full_name FROM ${tableName} WHERE admission_id = ?) LIMIT 1`,
                            [studentBranch, admissionId]
                        );
                        if (mainRows.length > 0) mainAdmissionId = mainRows[0].admission_id;
                        break;
                    }
                } catch (e) { /* table might not exist */ }
            }
        }

        if (!studentBranch) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        // Branch admins can only edit students in their branch
        if (admin.role === 'BRANCH' && admin.branch) {
            const adminBranchLower = admin.branch.toLowerCase().trim();
            const studentBranchLower = studentBranch.toLowerCase().trim();
            const adminBranchName = adminBranchLower.split(',')[0].trim();
            const studentBranchName = studentBranchLower.split(',')[0].trim();
            if (!studentBranchLower.includes(adminBranchName) && !adminBranchLower.includes(studentBranchName)) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only edit students in your branch'
                });
            }
        }

        const bt = getBranchTableName(studentBranch);
        const admissionTable = bt || 'admission_form';
        const musicTable = getBranchMusicPrefsTable(studentBranch) || 'music_preferences';
        const targetId = (bt && branchAdmissionId) ? branchAdmissionId : (mainAdmissionId || admissionId);

        const updateParams = [
            data.fullName || data.full_name,
            data.address ?? null,
            data.phone ?? null,
            data.dateOfBirth || data.date_of_birth || null,
            data.emailId || data.email_id || null,
            data.formNo || data.form_no || null,
            data.branch || studentBranch,
            data.admissionDate || data.admission_date,
            targetId
        ];

        await connection.execute(
            `UPDATE ${admissionTable} SET
                full_name = ?, address = ?, phone = ?, date_of_birth = ?,
                email_id = ?, form_no = ?, branch = ?, admission_date = ?
            WHERE admission_id = ?`,
            updateParams
        );

        const [musicRows] = await connection.execute(
            `SELECT preference_id FROM ${musicTable} WHERE admission_id = ?`,
            [targetId]
        );

        const musicParams = [
            data.instrumentalSelection || data.instrumental_selection || null,
            data.indianClassicalVocal || data.indian_classical_vocal || null,
            data.dance || null,
            data.educationJobDetails || data.education_job_details || null,
            data.joiningDate || data.joining_date || null,
            data.diplomaAdmissionYear || data.diploma_admission_year || null,
            targetId
        ];

        if (musicRows.length > 0) {
            await connection.execute(
                `UPDATE ${musicTable} SET
                    instrumental_selection = ?, indian_classical_vocal = ?, dance = ?,
                    education_job_details = ?, joining_date = ?, diploma_admission_year = ?
                WHERE admission_id = ?`,
                musicParams
            );
        } else {
            await connection.execute(
                `INSERT INTO ${musicTable} (admission_id, instrumental_selection, indian_classical_vocal, dance, education_job_details, joining_date, diploma_admission_year)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [targetId, ...musicParams.slice(0, -1)]
            );
        }

        // Sync to main admission_form if we updated branch table
        if (bt && mainAdmissionId) {
            await connection.execute(
                `UPDATE admission_form SET
                    full_name = ?, address = ?, phone = ?, date_of_birth = ?,
                    email_id = ?, form_no = ?, branch = ?, admission_date = ?
                WHERE admission_id = ?`,
                [...updateParams.slice(0, -1), mainAdmissionId]
            );
            const mainMusicTable = 'music_preferences';
            const [mainMusicRows] = await connection.execute(
                `SELECT preference_id FROM ${mainMusicTable} WHERE admission_id = ?`,
                [mainAdmissionId]
            );
            const mainMusicParams = [
                data.instrumentalSelection || data.instrumental_selection || null,
                data.indianClassicalVocal || data.indian_classical_vocal || null,
                data.dance || null,
                data.educationJobDetails || data.education_job_details || null,
                data.joiningDate || data.joining_date || null,
                data.diplomaAdmissionYear || data.diploma_admission_year || null,
                mainAdmissionId
            ];
            if (mainMusicRows.length > 0) {
                await connection.execute(
                    `UPDATE ${mainMusicTable} SET
                        instrumental_selection = ?, indian_classical_vocal = ?, dance = ?,
                        education_job_details = ?, joining_date = ?, diploma_admission_year = ?
                    WHERE admission_id = ?`,
                    mainMusicParams
                );
            } else {
                await connection.execute(
                    `INSERT INTO ${mainMusicTable} (admission_id, instrumental_selection, indian_classical_vocal, dance, education_job_details, joining_date, diploma_admission_year)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [mainAdmissionId, ...mainMusicParams.slice(0, -1)]
                );
            }
        }

        res.json({
            success: true,
            message: 'Student record updated successfully',
            admissionId: admissionId
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update student record'
        });
    } finally {
        connection.release();
    }
});

// ==========================================
// Delete Student (ROOT Admin Only)
// ==========================================
router.delete('/students/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const admissionId = parseInt(req.params.id);
        
        if (isNaN(admissionId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid admission ID'
            });
        }
        
        // Get admin info to verify ROOT access - MUST verify from database, not request body
        const { adminId, adminUsername } = req.body;
        
        // Always verify admin from database to prevent tampering
        let admin = null;
        if (adminId || adminUsername) {
            admin = await getAdminFromRequest(req, connection);
        }
        
        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin authentication required'
            });
        }
        
        // Only ROOT role admins can delete students (any root admin, not just username "root")
        if (admin.role !== 'ROOT') {
            return res.status(403).json({
                success: false,
                error: 'Only root administrators can delete students. Branch admins do not have delete permissions.'
            });
        }
        
        // Get student info before deletion (for branch-specific table deletion)
        const [students] = await connection.execute(
            'SELECT branch FROM admission_form WHERE admission_id = ?',
            [admissionId]
        );
        
        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }
        
        const studentBranch = students[0].branch;
        
        await connection.beginTransaction();
        
        try {
            // Delete from branch-specific tables first (if they exist)
            const branchTableName = getBranchTableName(studentBranch);
            if (branchTableName) {
                // Get branch admission_id first
                const [branchAdmissions] = await connection.execute(
                    `SELECT admission_id FROM ${branchTableName} WHERE branch = ? AND full_name = (SELECT full_name FROM admission_form WHERE admission_id = ?) LIMIT 1`,
                    [studentBranch, admissionId]
                );
                
                if (branchAdmissions.length > 0) {
                    const branchAdmissionId = branchAdmissions[0].admission_id;
                    
                    // Delete from branch-specific tables
                    const branchMusicPrefsTable = getBranchMusicPrefsTable(studentBranch);
                    const branchDonationFeeTable = getBranchDonationFeeTable(studentBranch);
                    const branchSignaturesTable = getBranchSignaturesTable(studentBranch);
                    
                    if (branchMusicPrefsTable) {
                        await connection.execute(
                            `DELETE FROM ${branchMusicPrefsTable} WHERE admission_id = ?`,
                            [branchAdmissionId]
                        );
                    }
                    
                    if (branchDonationFeeTable) {
                        await connection.execute(
                            `DELETE FROM ${branchDonationFeeTable} WHERE admission_id = ?`,
                            [branchAdmissionId]
                        );
                    }
                    
                    if (branchSignaturesTable) {
                        await connection.execute(
                            `DELETE FROM ${branchSignaturesTable} WHERE admission_id = ?`,
                            [branchAdmissionId]
                        );
                    }
                    
                    // Delete from branch admission table
                    await connection.execute(
                        `DELETE FROM ${branchTableName} WHERE admission_id = ?`,
                        [branchAdmissionId]
                    );
                }
            }
            
            // Delete from main tables (CASCADE will handle related records, but we'll delete explicitly for safety)
            await connection.execute(
                'DELETE FROM student_credentials WHERE admission_id = ?',
                [admissionId]
            );
            
            await connection.execute(
                'DELETE FROM admission_signatures WHERE admission_id = ?',
                [admissionId]
            );
            
            await connection.execute(
                'DELETE FROM donation_fee WHERE admission_id = ?',
                [admissionId]
            );
            
            await connection.execute(
                'DELETE FROM music_preferences WHERE admission_id = ?',
                [admissionId]
            );
            
            // Finally delete from admission_form (this should cascade, but explicit is safer)
            await connection.execute(
                'DELETE FROM admission_form WHERE admission_id = ?',
                [admissionId]
            );
            
            await connection.commit();
            
            res.json({
                success: true,
                message: 'Student deleted successfully'
            });
            
        } catch (deleteError) {
            await connection.rollback();
            throw deleteError;
        }
        
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete student'
        });
    } finally {
        connection.release();
    }
});

// Helper functions for branch table names (same as in register.js)
function getBranchTableName(branch) {
    if (!branch) return null;
    const branchLower = branch.toLowerCase();
    if (branchLower.includes('karmaveer') || branchLower.includes('karamveer')) {
        return 'karmaveer_nagar_table';
    }
    if (branchLower.includes('godoli')) {
        return 'godoli_satara_table';
    }
    if (branchLower.includes('krantismruti') || branchLower.includes('krantismurti')) {
        return 'krantismruti_satara_table';
    }
    if (branchLower.includes('karad')) {
        return 'karad_table';
    }
    return null;
}

function getBranchMusicPrefsTable(branch) {
    if (!branch) return null;
    const branchLower = branch.toLowerCase();
    if (branchLower.includes('karmaveer') || branchLower.includes('karamveer')) {
        return 'karmaveer_nagar_music_preferences';
    }
    if (branchLower.includes('godoli')) {
        return 'godoli_satara_music_preferences';
    }
    if (branchLower.includes('krantismruti') || branchLower.includes('krantismurti')) {
        return 'krantismruti_satara_music_preferences';
    }
    if (branchLower.includes('karad')) {
        return 'karad_music_preferences';
    }
    return null;
}

function getBranchDonationFeeTable(branch) {
    const branchLower = branch.toLowerCase();
    if (branchLower.includes('karmaveer') || branchLower.includes('karamveer')) {
        return 'karmaveer_nagar_donation_fee';
    }
    if (branchLower.includes('godoli')) {
        return 'godoli_satara_donation_fee';
    }
    if (branchLower.includes('krantismruti') || branchLower.includes('krantismurti')) {
        return 'krantismruti_satara_donation_fee';
    }
    if (branchLower.includes('karad')) {
        return 'karad_donation_fee';
    }
    return null;
}

function getBranchSignaturesTable(branch) {
    const branchLower = branch.toLowerCase();
    if (branchLower.includes('karmaveer') || branchLower.includes('karamveer')) {
        return 'karmaveer_nagar_signatures';
    }
    if (branchLower.includes('godoli')) {
        return 'godoli_satara_signatures';
    }
    if (branchLower.includes('krantismruti') || branchLower.includes('krantismurti')) {
        return 'krantismruti_satara_signatures';
    }
    if (branchLower.includes('karad')) {
        return 'karad_signatures';
    }
    return null;
}

// ==========================================
// Branch Manager Management Routes (Admin Only)
// ==========================================

// Add Branch Manager
router.post('/branch-managers', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { name, email, contactNo, branch, password } = req.body;
        
        if (!name || !email || !contactNo || !branch || !password) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }
        
        console.log(`[ADMIN] Adding branch manager: ${name} for branch ${branch}`);
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert branch manager
        await connection.execute(
            'INSERT INTO branch_managers (name, email, contact_no, branch, password) VALUES (?, ?, ?, ?, ?)',
            [name, email, contactNo, branch, hashedPassword]
        );
        
        console.log(`[ADMIN] Branch manager added successfully: ${email}`);
        
        res.json({
            success: true,
            message: 'Branch manager added successfully'
        });
        
    } catch (error) {
        console.error('[ADMIN] Error adding branch manager:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                error: 'Email already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to add branch manager'
        });
    } finally {
        connection.release();
    }
});

// Get All Branch Managers
router.get('/branch-managers', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const [managers] = await connection.execute(
            `SELECT id, name, email, contact_no as contactNo, branch, created_at as createdAt
             FROM branch_managers
             ORDER BY created_at DESC`
        );
        
        console.log(`[ADMIN] Retrieved ${managers.length} branch managers`);
        
        res.json({
            success: true,
            managers: managers
        });
        
    } catch (error) {
        console.error('[ADMIN] Error fetching branch managers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch branch managers'
        });
    } finally {
        connection.release();
    }
});

// Delete Branch Manager
router.delete('/branch-managers/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const managerId = parseInt(req.params.id);
        
        await connection.execute(
            'DELETE FROM branch_managers WHERE id = ?',
            [managerId]
        );
        
        console.log(`[ADMIN] Branch manager deleted: ID ${managerId}`);
        
        res.json({
            success: true,
            message: 'Branch manager deleted successfully'
        });
        
    } catch (error) {
        console.error('[ADMIN] Error deleting branch manager:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete branch manager'
        });
    } finally {
        connection.release();
    }
});

// Get All Donation Records
router.get('/donation-records', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        // First, check what tables exist with "donation" in the name
        try {
            const [tables] = await connection.execute(
                `SHOW TABLES LIKE '%donation%'`
            );
            console.log('[ADMIN] Tables with "donation" in name:', JSON.stringify(tables, null, 2));
        } catch (err) {
            console.log('[ADMIN] Could not list tables:', err.message);
        }

        // Check the structure of donation_record table
        try {
            const [columns] = await connection.execute(
                `DESCRIBE donation_record`
            );
            console.log('[ADMIN] donation_record table structure:', JSON.stringify(columns, null, 2));
        } catch (descError) {
            console.error('[ADMIN] Could not describe donation_record table:', descError.message);
        }

        // Fetch all donation records from donation_record table
        let donations = [];
        try {
            // Try to get all columns first to see what's available
            const [donationsResult] = await connection.execute(
                `SELECT * FROM donation_record ORDER BY created_at DESC`
            );
            donations = donationsResult || [];
            console.log(`[ADMIN] Successfully fetched ${donations.length} donation records from donation_record table`);
            if (donations.length > 0) {
                console.log('[ADMIN] Sample donation record:', JSON.stringify(donations[0], null, 2));
            }
        } catch (queryError) {
            console.error('[ADMIN] Error querying donation_record table:', queryError);
            console.error('[ADMIN] Error details:', {
                code: queryError.code,
                message: queryError.message,
                sqlState: queryError.sqlState,
                sqlMessage: queryError.sqlMessage
            });
            
            // Try alternative table names
            const alternativeTables = ['Donation_Record', 'DonationRecord', 'donations'];
            for (const altTable of alternativeTables) {
                try {
                    const [altResult] = await connection.execute(
                        `SELECT * FROM \`${altTable}\` ORDER BY created_at DESC`
                    );
                    console.log(`[ADMIN] Found ${altResult.length} records in table: ${altTable}`);
                    if (altResult.length > 0) {
                        donations = altResult;
                        break;
                    }
                } catch (altError) {
                    console.log(`[ADMIN] Table ${altTable} not found or error:`, altError.code);
                }
            }
        }

        // Calculate statistics - handle different column name formats
        const totalDonations = donations.length;
        
        // Handle different possible column names
        const getValue = (record, possibleKeys) => {
            for (const key of possibleKeys) {
                if (record[key] !== undefined) return record[key];
            }
            return 0;
        };
        
        const totalAmount = donations.reduce((sum, d) => {
            const value = getValue(d, ['donation_value', 'donationValue', 'amount', 'donation_amount']);
            return sum + parseFloat(value || 0);
        }, 0);
        
        const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;

        // Get current month donations
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const monthlyDonations = donations.filter(d => {
            const dateValue = getValue(d, ['date_of_donation', 'dateOfDonation', 'donation_date', 'date']);
            if (!dateValue) return false;
            const donationDate = new Date(dateValue);
            return donationDate.getMonth() + 1 === currentMonth && 
                   donationDate.getFullYear() === currentYear;
        });
        const donationsThisMonth = monthlyDonations.length;
        const monthlyAmount = monthlyDonations.reduce((sum, d) => {
            const value = getValue(d, ['donation_value', 'donationValue', 'amount', 'donation_amount']);
            return sum + parseFloat(value || 0);
        }, 0);

        // Monthly breakdown - properly sorted by year and month
        const monthlyData = {};
        donations.forEach(donation => {
            const dateValue = getValue(donation, ['date_of_donation', 'dateOfDonation', 'donation_date', 'date']);
            if (!dateValue) return;
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return; // Skip invalid dates
            
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11
            const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`; // YYYY-MM format for proper sorting
            const monthLabel = `${date.toLocaleString('default', { month: 'short' })} ${year}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { 
                    count: 0, 
                    amount: 0,
                    monthLabel: monthLabel,
                    year: year,
                    month: month
                };
            }
            monthlyData[monthKey].count++;
            const value = getValue(donation, ['donation_value', 'donationValue', 'amount', 'donation_amount']);
            monthlyData[monthKey].amount += parseFloat(value || 0);
        });

        const donationsByMonth = Object.entries(monthlyData)
            .map(([key, data]) => ({
                month: data.monthLabel,
                monthKey: key,
                year: data.year,
                monthNum: data.month,
                count: data.count,
                amount: data.amount
            }))
            .sort((a, b) => {
                // Sort by year first, then by month
                if (a.year !== b.year) {
                    return a.year - b.year;
                }
                return a.monthNum - b.monthNum;
            });

        // Top donors (by total amount)
        const donorTotals = {};
        donations.forEach(donation => {
            const donorName = getValue(donation, ['donated_by', 'donatedBy', 'donor_name', 'name', 'donor']);
            if (!donorName) return;
            if (!donorTotals[donorName]) {
                donorTotals[donorName] = { total: 0, count: 0 };
            }
            const value = getValue(donation, ['donation_value', 'donationValue', 'amount', 'donation_amount']);
            donorTotals[donorName].total += parseFloat(value || 0);
            donorTotals[donorName].count++;
        });

        const topDonors = Object.entries(donorTotals)
            .map(([name, data]) => ({
                name,
                total: data.total,
                count: data.count
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10); // Top 10 donors

        // Map donation records to ensure consistent field names for frontend
        const mappedDonations = donations.map(d => {
            return {
                donation_id: d.donation_id || d.id || d.donationId,
                receipt_no: d.receipt_no || d.receiptNo || d.receipt_number || d.receiptNumber,
                user_upi_id: d.user_upi_id || d.userUpiId || d.upi_id || d.upiId,
                donated_by: d.donated_by || d.donatedBy || d.donor_name || d.donorName || d.name,
                street_address: d.street_address || d.streetAddress || d.address || '',
                city: d.city || '',
                state: d.state || '',
                zip: d.zip || d.zip_code || d.zipCode || '',
                date_of_donation: d.date_of_donation || d.dateOfDonation || d.donation_date || d.date,
                donation_value: d.donation_value || d.donationValue || d.amount || d.donation_amount || 0,
                description: d.description || '',
                tax_id: d.tax_id || d.taxId || null,
                created_at: d.created_at || d.createdAt || d.date_created || new Date().toISOString()
            };
        });

        console.log(`[ADMIN] Mapped ${mappedDonations.length} donation records for frontend`);
        
        res.json({
            success: true,
            donations: mappedDonations,
            stats: {
                totalDonations,
                totalAmount,
                averageDonation,
                donationsThisMonth,
                monthlyAmount,
                donationsByMonth,
                topDonors
            }
        });
        
    } catch (error) {
        console.error('[ADMIN] Error fetching donation records:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch donation records'
        });
    } finally {
        connection.release();
    }
});

// Update Donation Record
router.put('/donation-records/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const donationId = parseInt(req.params.id);
        const data = req.body;
        
        if (isNaN(donationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid donation ID'
            });
        }

        // Validate required fields
        if (!data.userUpiId || !data.donatedBy || !data.streetAddress || !data.city || 
            !data.state || !data.zip || !data.dateOfDonation || !data.donationValue || !data.description) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields. Please fill all required fields.'
            });
        }

        console.log(`[ADMIN] Updating donation record with ID: ${donationId}`);

        // Check if donation exists
        const [donations] = await connection.execute(
            'SELECT donation_id FROM donation_record WHERE donation_id = ?',
            [donationId]
        );

        if (donations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Donation record not found'
            });
        }

        // Update the donation record
        await connection.execute(
            `UPDATE donation_record 
            SET user_upi_id = ?, 
                donated_by = ?, 
                street_address = ?, 
                city = ?, 
                state = ?, 
                zip = ?, 
                date_of_donation = ?, 
                donation_value = ?, 
                description = ?, 
                tax_id = ?
            WHERE donation_id = ?`,
            [
                data.userUpiId,
                data.donatedBy,
                data.streetAddress,
                data.city,
                data.state,
                data.zip,
                data.dateOfDonation,
                parseFloat(data.donationValue),
                data.description,
                data.taxId || null,
                donationId
            ]
        );

        console.log(`[ADMIN] Successfully updated donation record with ID: ${donationId}`);

        res.json({
            success: true,
            message: 'Donation record updated successfully',
            donationId: donationId
        });
        
    } catch (error) {
        console.error('[ADMIN] Error updating donation record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update donation record'
        });
    } finally {
        connection.release();
    }
});

// Delete Donation Record
router.delete('/donation-records/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const donationId = parseInt(req.params.id);
        
        if (isNaN(donationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid donation ID'
            });
        }

        console.log(`[ADMIN] Deleting donation record with ID: ${donationId}`);

        // Check if donation exists
        const [donations] = await connection.execute(
            'SELECT donation_id, receipt_no FROM donation_record WHERE donation_id = ?',
            [donationId]
        );

        if (donations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Donation record not found'
            });
        }

        // Delete the donation record
        const [result] = await connection.execute(
            'DELETE FROM donation_record WHERE donation_id = ?',
            [donationId]
        );

        console.log(`[ADMIN] Successfully deleted donation record with ID: ${donationId}`);

        res.json({
            success: true,
            message: 'Donation record deleted successfully',
            deletedId: donationId
        });
        
    } catch (error) {
        console.error('[ADMIN] Error deleting donation record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete donation record'
        });
    } finally {
        connection.release();
    }
});

// ==========================================
// Student Fee Invoices (donation_fee - list and delete)
// ==========================================

// POST /api/admin/invoices - List all student fee payments (invoices) for admin scope
router.post('/invoices', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const admin = await getAdminFromRequest(req, connection);
        const { adminRole, adminBranch } = req.body || {};
        const role = admin?.role || adminRole;
        const branch = admin?.branch || adminBranch;

        console.log(`[ADMIN INVOICES] Request - Role: ${role}, Branch: ${branch}`);

        if (!role || (role === 'BRANCH' && !branch)) {
            return res.status(401).json({ success: false, error: 'Admin authentication required' });
        }

        let donationTable = 'donation_fee';
        let admissionTable = 'admission_form';
        let whereClause = '';
        const params = [];

        if (role === 'BRANCH' && branch) {
            const branchDonationFeeTable = getBranchDonationFeeTable(branch);
            const branchTableName = getBranchTableName(branch);
            if (branchTableName && branchDonationFeeTable) {
                donationTable = branchDonationFeeTable;
                admissionTable = branchTableName;
                console.log(`[ADMIN INVOICES] Using branch tables: ${donationTable}, ${admissionTable}`);
            } else {
                const adminBranchLower = branch.toLowerCase().trim();
                const branchName = adminBranchLower.split(',')[0].trim();
                whereClause = ' AND (LOWER(TRIM(af.branch)) = LOWER(TRIM(?)) OR LOWER(TRIM(af.branch)) LIKE ?)';
                params.push(branch, `%${branchName}%`);
                console.log(`[ADMIN INVOICES] Using main tables with branch filter: ${branch}`);
            }
        } else if (role === 'ROOT' && req.body.branch && req.body.branch !== 'all') {
            whereClause = ' AND af.branch = ?';
            params.push(req.body.branch);
            console.log(`[ADMIN INVOICES] ROOT admin filtering by branch: ${req.body.branch}`);
        } else {
            console.log(`[ADMIN INVOICES] ROOT admin - fetching all invoices from all branches`);
        }

        // Try query with created_at first, fallback if column doesn't exist
        let query = `
            SELECT df.donation_id, df.admission_id, af.full_name, af.branch, af.form_no,
                df.amount_paid, df.transaction_id, df.payment_type, df.do_no,
                COALESCE(df.created_at, NOW()) as paid_date
            FROM ${donationTable} df
            JOIN ${admissionTable} af ON af.admission_id = df.admission_id
            WHERE 1=1 ${whereClause}
            ORDER BY df.donation_id DESC
        `;
        
        let rows = [];
        try {
            [rows] = await connection.execute(query, params);
            console.log(`[ADMIN INVOICES] Query successful - found ${rows.length} invoice records`);
        } catch (queryErr) {
            // If do_no column doesn't exist (e.g. branch-specific tables), retry without it
            if (queryErr.code === 'ER_BAD_FIELD_ERROR' && queryErr.message.includes('do_no')) {
                console.log(`[ADMIN INVOICES] do_no column not found, using query without do_no`);
                try {
                    query = `
                        SELECT df.donation_id, df.admission_id, af.full_name, af.branch, af.form_no,
                            df.amount_paid, df.transaction_id, df.payment_type,
                            COALESCE(df.created_at, NOW()) as paid_date
                        FROM ${donationTable} df
                        JOIN ${admissionTable} af ON af.admission_id = df.admission_id
                        WHERE 1=1 ${whereClause}
                        ORDER BY df.donation_id DESC
                    `;
                    [rows] = await connection.execute(query, params);
                    rows.forEach(r => { r.do_no = null; });
                } catch (e2) {
                    if (e2.code === 'ER_BAD_FIELD_ERROR' && e2.message.includes('created_at')) {
                        query = `
                            SELECT df.donation_id, df.admission_id, af.full_name, af.branch, af.form_no,
                                df.amount_paid, df.transaction_id, df.payment_type, NOW() as paid_date
                            FROM ${donationTable} df
                            JOIN ${admissionTable} af ON af.admission_id = df.admission_id
                            WHERE 1=1 ${whereClause}
                            ORDER BY df.donation_id DESC
                        `;
                        [rows] = await connection.execute(query, params);
                        rows.forEach(r => { r.do_no = null; });
                    } else throw e2;
                }
            }
            // If created_at column doesn't exist, use simpler query
            else if (queryErr.code === 'ER_BAD_FIELD_ERROR' && queryErr.message.includes('created_at')) {
                console.log(`[ADMIN INVOICES] created_at column not found, using fallback query`);
                query = `
                    SELECT df.donation_id, df.admission_id, af.full_name, af.branch, af.form_no,
                        df.amount_paid, df.transaction_id, df.payment_type, df.do_no,
                        NOW() as paid_date
                    FROM ${donationTable} df
                    JOIN ${admissionTable} af ON af.admission_id = df.admission_id
                    WHERE 1=1 ${whereClause}
                    ORDER BY df.donation_id DESC
                `;
                [rows] = await connection.execute(query, params);
                console.log(`[ADMIN INVOICES] Fallback query successful - found ${rows.length} invoice records`);
            } else {
                throw queryErr;
            }
        }

        const invoices = rows.map(r => ({
            donationId: r.donation_id,
            admissionId: r.admission_id,
            fullName: r.full_name,
            branch: r.branch,
            formNo: r.form_no,
            doNo: r.do_no || null,
            amountPaid: r.amount_paid || 0,
            transactionId: r.transaction_id,
            paymentType: r.payment_type,
            paidDate: r.paid_date
        }));

        console.log(`[ADMIN INVOICES] Returning ${invoices.length} invoices`);
        res.json({
            success: true,
            data: invoices
        });
    } catch (err) {
        console.error('[ADMIN] Invoices list error:', err);
        console.error('[ADMIN] Error details:', err.message, err.stack);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch invoices',
            details: err.message 
        });
    } finally {
        connection.release();
    }
});

// DELETE /api/admin/invoices/:id - Delete one fee payment (donation_fee row) by donation_id
router.delete('/invoices/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const admin = await getAdminFromRequest(req, connection);
        const donationId = parseInt(req.params.id, 10);
        if (isNaN(donationId)) {
            return res.status(400).json({ success: false, error: 'Invalid donation ID' });
        }

        if (!admin) {
            return res.status(401).json({ success: false, error: 'Admin authentication required' });
        }

        let donationTable = 'donation_fee';
        let admissionTable = 'admission_form';
        let whereClause = 'df.donation_id = ?';
        const params = [donationId];

        if (admin.role === 'BRANCH' && admin.branch) {
            const branchDonationFeeTable = getBranchDonationFeeTable(admin.branch);
            const branchTableName = getBranchTableName(admin.branch);
            if (branchTableName && branchDonationFeeTable) {
                donationTable = branchDonationFeeTable;
                admissionTable = branchTableName;
            } else {
                const adminBranchLower = admin.branch.toLowerCase().trim();
                const branchName = adminBranchLower.split(',')[0].trim();
                whereClause = 'df.donation_id = ? AND (LOWER(TRIM(af.branch)) = LOWER(TRIM(?)) OR LOWER(TRIM(af.branch)) LIKE ?)';
                params.push(admin.branch, `%${branchName}%`);
            }
        }

        const [existing] = await connection.execute(
            `SELECT df.donation_id, af.branch FROM ${donationTable} df
             JOIN ${admissionTable} af ON af.admission_id = df.admission_id
             WHERE ${whereClause}`,
            params
        );
        if (existing.length === 0) {
            return res.status(404).json({ success: false, error: 'Invoice not found or access denied' });
        }

        await connection.execute(
            `DELETE FROM ${donationTable} WHERE donation_id = ?`,
            [donationId]
        );
        res.json({ success: true, message: 'Invoice deleted successfully', deletedId: donationId });
    } catch (err) {
        console.error('[ADMIN] Delete invoice error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete invoice' });
    } finally {
        connection.release();
    }
});

// ==========================================
// Examination (admin: settings + multiple exam info items)
// ==========================================
async function ensureExaminationTables(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS examination_settings (
            id INT PRIMARY KEY DEFAULT 1,
            form_enabled TINYINT(1) DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    const [existingSettings] = await connection.execute('SELECT 1 FROM examination_settings WHERE id = 1');
    if (existingSettings.length === 0) {
        await connection.execute(`INSERT INTO examination_settings (id, form_enabled) VALUES (1, 0)`);
    }
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS examination_info (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL DEFAULT '',
            content TEXT,
            exam_date DATE NULL,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
}

router.get('/examination', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await ensureExaminationTables(connection);
        const [settingsRows] = await connection.execute(
            'SELECT form_enabled FROM examination_settings WHERE id = 1'
        );
        const formEnabled = settingsRows[0] ? Boolean(settingsRows[0].form_enabled) : false;
        const [infoRows] = await connection.execute(
            'SELECT id, title, content, exam_date, sort_order, updated_at FROM examination_info ORDER BY sort_order ASC, id ASC'
        );
        const items = (infoRows || []).map((r) => ({
            id: r.id,
            title: r.title || '',
            content: r.content || '',
            examDate: r.exam_date || null,
            sortOrder: r.sort_order ?? 0,
            updatedAt: r.updated_at || null
        }));
        res.json({
            success: true,
            formEnabled,
            items
        });
    } catch (err) {
        console.error('Admin examination GET error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch examination data' });
    } finally {
        connection.release();
    }
});

// Update only form_enabled (on/off toggle)
router.put('/examination', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { formEnabled } = req.body || {};
        await ensureExaminationTables(connection);
        await connection.execute(
            'UPDATE examination_settings SET form_enabled = ? WHERE id = 1',
            [formEnabled ? 1 : 0]
        );
        res.json({
            success: true,
            formEnabled: Boolean(formEnabled),
            message: 'Exam registration setting updated'
        });
    } catch (err) {
        console.error('Admin examination PUT error:', err);
        res.status(500).json({ success: false, error: 'Failed to update setting' });
    } finally {
        connection.release();
    }
});

// Add new exam info item (POST /examination or POST /examination/info)
const addExamInfoHandler = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { title, content, examDate } = req.body || {};
        await ensureExaminationTables(connection);
        const [maxRows] = await connection.execute('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM examination_info');
        const nextOrder = maxRows[0]?.next_order ?? 1;
        const [insertResult] = await connection.execute(
            'INSERT INTO examination_info (title, content, exam_date, sort_order) VALUES (?, ?, ?, ?)',
            [String(title || '').trim(), content != null ? String(content) : '', examDate || null, nextOrder]
        );
        const insertId = insertResult.insertId;
        const [rows] = await connection.execute(
            'SELECT id, title, content, exam_date, sort_order, updated_at FROM examination_info WHERE id = ?',
            [insertId]
        );
        const row = rows[0] || {};
        res.status(201).json({
            success: true,
            item: {
                id: row.id,
                title: row.title || '',
                content: row.content || '',
                examDate: row.exam_date || null,
                sortOrder: row.sort_order ?? 0,
                updatedAt: row.updated_at || null
            },
            message: 'Exam info added'
        });
    } catch (err) {
        console.error('Admin examination POST info error:', err);
        res.status(500).json({ success: false, error: 'Failed to add exam info' });
    } finally {
        connection.release();
    }
};
router.post('/examination', addExamInfoHandler);
router.post('/examination/info', addExamInfoHandler);
router.post('/examination/add', addExamInfoHandler);

// Update exam info item
// Reorder exam info items (body: { order: [id1, id2, id3, ...] })
router.put('/examination/info/reorder', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { order } = req.body || {};
        if (!Array.isArray(order) || order.length === 0) {
            return res.status(400).json({ success: false, error: 'Order array is required' });
        }
        await ensureExaminationTables(connection);
        for (let i = 0; i < order.length; i++) {
            const id = parseInt(order[i], 10);
            if (isNaN(id) || id < 1) continue;
            await connection.execute(
                'UPDATE examination_info SET sort_order = ? WHERE id = ?',
                [i, id]
            );
        }
        const [infoRows] = await connection.execute(
            'SELECT id, title, content, exam_date, sort_order, updated_at FROM examination_info ORDER BY sort_order ASC, id ASC'
        );
        const items = (infoRows || []).map((r) => ({
            id: r.id,
            title: r.title || '',
            content: r.content || '',
            examDate: r.exam_date || null,
            sortOrder: r.sort_order ?? 0,
            updatedAt: r.updated_at || null
        }));
        res.json({
            success: true,
            items,
            message: 'Order updated'
        });
    } catch (err) {
        console.error('Admin examination reorder error:', err);
        res.status(500).json({ success: false, error: 'Failed to reorder' });
    } finally {
        connection.release();
    }
});

router.put('/examination/info/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 1) {
            return res.status(400).json({ success: false, error: 'Invalid id' });
        }
        const { title, content, examDate } = req.body || {};
        await ensureExaminationTables(connection);
        await connection.execute(
            'UPDATE examination_info SET title = ?, content = ?, exam_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [String(title != null ? title : '').trim(), content != null ? String(content) : '', examDate || null, id]
        );
        const [rows] = await connection.execute(
            'SELECT id, title, content, exam_date, sort_order, updated_at FROM examination_info WHERE id = ?',
            [id]
        );
        const row = rows[0];
        if (!row) {
            return res.status(404).json({ success: false, error: 'Exam info not found' });
        }
        res.json({
            success: true,
            item: {
                id: row.id,
                title: row.title || '',
                content: row.content || '',
                examDate: row.exam_date || null,
                sortOrder: row.sort_order ?? 0,
                updatedAt: row.updated_at || null
            },
            message: 'Exam info updated'
        });
    } catch (err) {
        console.error('Admin examination PUT info error:', err);
        res.status(500).json({ success: false, error: 'Failed to update exam info' });
    } finally {
        connection.release();
    }
});

// Delete exam info item
router.delete('/examination/info/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 1) {
            return res.status(400).json({ success: false, error: 'Invalid id' });
        }
        await ensureExaminationTables(connection);
        const [result] = await connection.execute('DELETE FROM examination_info WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Exam info not found' });
        }
        res.json({ success: true, message: 'Exam info deleted' });
    } catch (err) {
        console.error('Admin examination DELETE info error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete exam info' });
    } finally {
        connection.release();
    }
});

module.exports = router;
