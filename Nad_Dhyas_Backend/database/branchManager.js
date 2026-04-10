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
        
        console.log(`[BRANCH MANAGER DASHBOARD] Fetching stats for ${manager.name} - Branch: ${branch}`);
        
        // Get total students in branch
        const [totalResult] = await connection.execute(
            'SELECT COUNT(*) as total FROM admission_form WHERE branch = ?',
            [branch]
        );
        const totalStudents = totalResult[0].total;
        
        // Get total fee collected
        const [feeResult] = await connection.execute(
            `SELECT 
                COALESCE(SUM(df.amount_paid), 0) as totalCollected
             FROM donation_fee df
             INNER JOIN admission_form af ON df.admission_id = af.admission_id
             WHERE af.branch = ?`,
            [branch]
        );
        const totalCollected = feeResult[0].totalCollected;
        
        // Get remaining fee
        const [remainingResult] = await connection.execute(
            `SELECT 
                SUM(COALESCE(af.total_fee, 10200) - COALESCE(payments.total_paid, 0)) as totalRemaining
             FROM admission_form af
             LEFT JOIN (
                 SELECT admission_id, SUM(amount_paid) as total_paid
                 FROM donation_fee
                 GROUP BY admission_id
             ) payments ON af.admission_id = payments.admission_id
             WHERE af.branch = ?`,
            [branch]
        );
        const totalRemaining = remainingResult[0].totalRemaining || 0;
        
        // Get category-wise (diploma year) student count
        const [categoryStats] = await connection.execute(
            `SELECT 
                mp.diploma_admission_year as category,
                COUNT(*) as count
             FROM admission_form af
             LEFT JOIN music_preferences mp ON af.admission_id = mp.admission_id
             WHERE af.branch = ?
             GROUP BY mp.diploma_admission_year`,
            [branch]
        );
        
        console.log(`[BRANCH MANAGER DASHBOARD] Branch: ${branch}, Students: ${totalStudents}, Collected: ₹${totalCollected}`);
        
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
        
        console.log(`[BRANCH MANAGER STUDENTS] Fetching students for branch: ${branch}`);
        
        // Get all students for this branch with payment info
        const [students] = await connection.execute(
            `SELECT 
                af.admission_id,
                af.full_name,
                af.form_no,
                af.branch,
                af.phone,
                af.email,
                af.admission_date,
                mp.diploma_admission_year,
                COALESCE(af.total_fee, 10200) as total_fee,
                COALESCE(payments.total_paid, 0) as amount_paid,
                (COALESCE(af.total_fee, 10200) - COALESCE(payments.total_paid, 0)) as remaining_fee,
                payments.payment_count
             FROM admission_form af
             LEFT JOIN music_preferences mp ON af.admission_id = mp.admission_id
             LEFT JOIN (
                 SELECT 
                     admission_id,
                     SUM(amount_paid) as total_paid,
                     COUNT(*) as payment_count
                 FROM donation_fee
                 GROUP BY admission_id
             ) payments ON af.admission_id = payments.admission_id
             WHERE af.branch = ?
             ORDER BY af.admission_date DESC`,
            [branch]
        );
        
        console.log(`[BRANCH MANAGER STUDENTS] Found ${students.length} students for branch ${branch}`);
        
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
