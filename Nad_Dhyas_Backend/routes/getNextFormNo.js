const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Helper function to get form number prefix based on branch
function getFormPrefix(branch) {
    // Normalize branch name for matching
    const normalizedBranch = branch.toLowerCase().trim();
    
    if (normalizedBranch.includes('karmaveer') || normalizedBranch.includes('karmaveer nagar')) {
        return 'S-KR';
    }
    if (normalizedBranch.includes('godoli')) {
        return 'S-GO';
    }
    if (normalizedBranch.includes('krantismruti')) {
        return 'S-KS';
    }
    if (normalizedBranch.includes('karad')) {
        return 'K-VA';
    }
    return 'FG-';
}

// GET /api/getNextFormNo?branch=... - Get next form number without incrementing
router.get('/', async (req, res) => {
    try {
        const branch = req.query.branch;
        
        if (!branch) {
            return res.status(400).json({ error: 'Branch is required' });
        }
        
        // Ensure form_counters table exists
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS form_counters (
                    branch VARCHAR(100) PRIMARY KEY,
                    seq INT DEFAULT 0 NOT NULL
                )
            `);
        } catch (err) {
            // Table might already exist, continue
        }
        
        // Get current sequence for this branch
        const [counters] = await pool.execute(
            'SELECT seq FROM form_counters WHERE branch = ?',
            [branch]
        );
        
        let currentSeq = 0;
        if (counters.length > 0) {
            currentSeq = counters[0].seq;
        } else {
            // Create counter entry if it doesn't exist
            await pool.execute(
                'INSERT INTO form_counters (branch, seq) VALUES (?, ?)',
                [branch, 0]
            );
        }
        
        const nextSeq = currentSeq + 1;
        const prefix = getFormPrefix(branch);
        const paddedSeq = nextSeq.toString().padStart(4, '0');
        const nextFormNo = `${prefix}-${paddedSeq}`;
        
        res.json({ formNo: nextFormNo });
        
    } catch (error) {
        console.error('Error fetching next form No:', error);
        res.status(500).json({ error: 'Failed to fetch form no' });
    }
});

module.exports = router;

