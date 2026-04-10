const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// ==========================================
// Create Branch Manager Table
// ==========================================
async function ensureBranchManagerTable() {
    const connection = await pool.getConnection();
    try {
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS branch_managers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                contact_no VARCHAR(15) NOT NULL,
                branch VARCHAR(100) NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_branch (branch),
                INDEX idx_contact (contact_no)
            )
        `);
        console.log('[BRANCH MANAGER] Table ensured');
    } finally {
        connection.release();
    }
}

// Initialize table on module load
ensureBranchManagerTable();

// ==========================================
// Branch Manager Login
// ==========================================
router.post('/login', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        
        console.log(`[BRANCH MANAGER LOGIN] Attempt for email: ${email}`);
        
        // Get branch manager by email
        const [managers] = await connection.execute(
            'SELECT * FROM branch_managers WHERE email = ?',
            [email]
        );
        
        if (managers.length === 0) {
            console.log('[BRANCH MANAGER LOGIN] Manager not found');
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        
        const manager = managers[0];
        
        // Verify password
        const passwordMatch = await bcrypt.compare(password, manager.password);
        
        if (!passwordMatch) {
            console.log('[BRANCH MANAGER LOGIN] Password mismatch');
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        
        console.log(`[BRANCH MANAGER LOGIN] Success for ${manager.name} - Branch: ${manager.branch}`);
        
        // Return manager info (excluding password)
        res.json({
            success: true,
            manager: {
                id: manager.id,
                name: manager.name,
                email: manager.email,
                contactNo: manager.contact_no,
                branch: manager.branch
            }
        });
        
    } catch (error) {
        console.error('[BRANCH MANAGER LOGIN] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    } finally {
        connection.release();
    }
});

// ==========================================
// Get Branch Manager Dashboard Stats
// ==========================================
router.get('/dashboard/:managerId', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const managerId = parseInt(req.params.managerId);
        
        // Get manager details
        const [managers] = await connection.execute(
            'SELECT * FROM branch_managers WHERE id = ?',
            [managerId]
        );
        
        if (managers.length === 0) {
            return res.status(404).json({ error: 'Manager not found' });
        }
        
        const manager = managers[0];
        const branch = manager.branch;
        
        console.log(`[BRANCH MANAGER DASHBOARD] Fetching stats for ${manager.name} - Branch: "${branch}"`);
        
        // Debug: Check all branches in database
        const [allBranches] = await connection.execute(
            'SELECT DISTINCT branch FROM admission_form'
        );
        console.log('[BRANCH MANAGER DASHBOARD] Available branches in DB:', allBranches.map(b => `"${b.branch}"`).join(', '));
        
        // Get total students in branch (case-insensitive)
        const [totalResult] = await connection.execute(
            'SELECT COUNT(*) as total FROM admission_form WHERE TRIM(LOWER(branch)) = TRIM(LOWER(?))',
            [branch]
        );
        const totalStudents = totalResult[0].total;
        
        console.log(`[BRANCH MANAGER DASHBOARD] Total students found: ${totalStudents}`);
        
        // Get total fee collected (case-insensitive)
        const [feeResult] = await connection.execute(
            `SELECT 
                COALESCE(SUM(CAST(df.amount_paid AS DECIMAL(10,2))), 0) as totalCollected
             FROM donation_fee df
             INNER JOIN admission_form af ON df.admission_id = af.admission_id
             WHERE TRIM(LOWER(af.branch)) = TRIM(LOWER(?))`,
            [branch]
        );
        const totalCollected = feeResult[0].totalCollected;
        
        console.log(`[BRANCH MANAGER DASHBOARD] Total collected: ₹${totalCollected}`);
        
        // Get remaining fee (case-insensitive)
        const [remainingResult] = await connection.execute(
            `SELECT 
                SUM(
                    CASE 
                        WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                        WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                        WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                        ELSE 10200
                    END - COALESCE(payments.total_paid, 0)
                ) as totalRemaining
             FROM admission_form af
             LEFT JOIN music_preferences mp ON af.admission_id = mp.admission_id
             LEFT JOIN (
                 SELECT admission_id, SUM(CAST(amount_paid AS DECIMAL(10,2))) as total_paid
                 FROM donation_fee
                 GROUP BY admission_id
             ) payments ON af.admission_id = payments.admission_id
             WHERE TRIM(LOWER(af.branch)) = TRIM(LOWER(?))`,
            [branch]
        );
        const totalRemaining = remainingResult[0].totalRemaining || 0;
        
        console.log(`[BRANCH MANAGER DASHBOARD] Total remaining: ₹${totalRemaining}`);
        
        // Get category-wise (diploma year) student count (case-insensitive)
        const [categoryStats] = await connection.execute(
            `SELECT 
                mp.diploma_admission_year as category,
                COUNT(*) as count
             FROM admission_form af
             LEFT JOIN music_preferences mp ON af.admission_id = mp.admission_id
             WHERE TRIM(LOWER(af.branch)) = TRIM(LOWER(?))
             GROUP BY mp.diploma_admission_year`,
            [branch]
        );
        
        console.log(`[BRANCH MANAGER DASHBOARD] Branch: ${branch}, Students: ${totalStudents}, Collected: ₹${totalCollected}, Remaining: ₹${totalRemaining}`);
        
        res.json({
            success: true,
            stats: {
                branch: branch,
                totalStudents: totalStudents,
                totalCollected: totalCollected,
                totalRemaining: totalRemaining,
                categoryWise: categoryStats,
                manager: {
                    id: manager.id,
                    name: manager.name,
                    email: manager.email,
                    contactNo: manager.contact_no
                }
            }
        });
        
    } catch (error) {
        console.error('[BRANCH MANAGER DASHBOARD] Error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    } finally {
        connection.release();
    }
});

// ==========================================
// Get Students List for Branch Manager
// ==========================================
router.get('/students/:managerId', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const managerId = parseInt(req.params.managerId);
        
        // Get manager details
        const [managers] = await connection.execute(
            'SELECT * FROM branch_managers WHERE id = ?',
            [managerId]
        );
        
        if (managers.length === 0) {
            return res.status(404).json({ error: 'Manager not found' });
        }
        
        const branch = managers[0].branch;
        
        console.log(`[BRANCH MANAGER STUDENTS] Fetching students for branch: "${branch}"`);
        
        // Debug: Check all branches in database
        const [allBranches] = await connection.execute(
            'SELECT DISTINCT branch, COUNT(*) as count FROM admission_form GROUP BY branch'
        );
        console.log('[BRANCH MANAGER STUDENTS] Available branches:', allBranches.map(b => `"${b.branch}": ${b.count} students`).join(', '));
        
        // Get all students for this branch with payment info (case-insensitive)
        const [students] = await connection.execute(
            `SELECT 
                af.admission_id,
                af.full_name,
                af.form_no,
                af.branch,
                af.phone,
                af.email_id as email,
                af.admission_date,
                mp.diploma_admission_year,
                CASE 
                    WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                    WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                    WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                    ELSE 10200
                END as total_fee,
                COALESCE(payments.total_paid, 0) as amount_paid,
                (CASE 
                    WHEN mp.diploma_admission_year = 'First Year' THEN 10200
                    WHEN mp.diploma_admission_year = 'Second Year' THEN 10200
                    WHEN mp.diploma_admission_year = 'Third Year' THEN 12200
                    ELSE 10200
                END - COALESCE(payments.total_paid, 0)) as remaining_fee,
                payments.payment_count
             FROM admission_form af
             LEFT JOIN music_preferences mp ON af.admission_id = mp.admission_id
             LEFT JOIN (
                 SELECT 
                     admission_id,
                     SUM(CAST(amount_paid AS DECIMAL(10,2))) as total_paid,
                     COUNT(*) as payment_count
                 FROM donation_fee
                 GROUP BY admission_id
             ) payments ON af.admission_id = payments.admission_id
             WHERE TRIM(LOWER(af.branch)) = TRIM(LOWER(?))
             ORDER BY af.admission_date DESC`,
            [branch]
        );
        
        console.log(`[BRANCH MANAGER STUDENTS] Found ${students.length} students for branch "${branch}"`);
        
        res.json({
            success: true,
            students: students,
            branch: branch
        });
        
    } catch (error) {
        console.error('[BRANCH MANAGER STUDENTS] Error:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    } finally {
        connection.release();
    }
});

module.exports = router;
