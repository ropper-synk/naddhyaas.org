const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Helper function to generate donation receipt number (ND-001, ND-002, etc.)
async function generateDonationReceiptNo(connection) {
    // Ensure donation_counters table exists
    try {
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS donation_counters (
                counter_id INT AUTO_INCREMENT PRIMARY KEY,
                seq INT DEFAULT 0 NOT NULL
            )
        `);
    } catch (err) {
        // Table might already exist, continue
    }
    
    // Get or create counter
    const [counters] = await connection.execute(
        'SELECT seq FROM donation_counters ORDER BY counter_id DESC LIMIT 1'
    );
    
    let seq = 1;
    if (counters.length > 0) {
        seq = counters[0].seq + 1;
        await connection.execute(
            'UPDATE donation_counters SET seq = ? ORDER BY counter_id DESC LIMIT 1',
            [seq]
        );
    } else {
        await connection.execute(
            'INSERT INTO donation_counters (seq) VALUES (?)',
            [seq]
        );
    }
    
    return `ND-${seq.toString().padStart(3, '0')}`;
}

// GET /api/donation/receipt-no - Get next donation receipt number (without incrementing)
router.get('/receipt-no', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        // Ensure donation_counters table exists
        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS donation_counters (
                    counter_id INT AUTO_INCREMENT PRIMARY KEY,
                    seq INT DEFAULT 0 NOT NULL
                )
            `);
        } catch (err) {
            // Table might already exist, continue
        }
        
        // Get current sequence
        const [counters] = await connection.execute(
            'SELECT seq FROM donation_counters ORDER BY counter_id DESC LIMIT 1'
        );
        
        let currentSeq = 0;
        if (counters.length > 0) {
            currentSeq = counters[0].seq;
        } else {
            // Create counter entry if it doesn't exist
            await connection.execute(
                'INSERT INTO donation_counters (seq) VALUES (?)',
                [0]
            );
        }
        
        const nextSeq = currentSeq + 1;
        const receiptNo = `ND-${nextSeq.toString().padStart(3, '0')}`;
        
        res.json({ receiptNo });
        
    } catch (error) {
        console.error('Error fetching donation receipt number:', error);
        res.status(500).json({ error: 'Failed to fetch receipt number' });
    } finally {
        connection.release();
    }
});

// POST /api/donate - Register a new donation
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const data = req.body;
        
        // Validate required fields for new donation form
        if (!data.userUpiId || !data.donatedBy || !data.streetAddress || !data.city || 
            !data.state || !data.zip || !data.dateOfDonation || !data.donationValue || !data.description) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields. Please fill all required fields.'
            });
        }
        
        // Generate receipt number (ND-001, ND-002, etc.)
        const receiptNumber = await generateDonationReceiptNo(connection);
        
        // Create donation_record table if it doesn't exist
        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS donation_record (
                    donation_id INT AUTO_INCREMENT PRIMARY KEY,
                    receipt_no VARCHAR(20) NOT NULL UNIQUE,
                    user_upi_id VARCHAR(100) NOT NULL,
                    donated_by VARCHAR(150) NOT NULL,
                    street_address VARCHAR(255) NOT NULL,
                    city VARCHAR(100) NOT NULL,
                    state VARCHAR(100) NOT NULL,
                    zip VARCHAR(10) NOT NULL,
                    date_of_donation DATE NOT NULL,
                    donation_value DECIMAL(10, 2) NOT NULL,
                    description TEXT NOT NULL,
                    tax_id VARCHAR(50) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_receipt_no (receipt_no),
                    INDEX idx_donated_by (donated_by),
                    INDEX idx_date_of_donation (date_of_donation)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('[DONATE] donation_record table created or already exists');
        } catch (tableError) {
            console.error('[DONATE] Error creating donation_record table:', tableError);
            throw tableError;
        }
        
        // Insert donation record into donation_record table
        const [result] = await connection.execute(
            `INSERT INTO donation_record 
            (receipt_no, user_upi_id, donated_by, street_address, city, state, zip, date_of_donation, donation_value, description, tax_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                receiptNumber,
                data.userUpiId,
                data.donatedBy,
                data.streetAddress,
                data.city,
                data.state,
                data.zip,
                data.dateOfDonation,
                parseFloat(data.donationValue),
                data.description,
                data.taxId || null
            ]
        );
        
        res.status(201).json({
            success: true,
            id: result.insertId,
            receiptNo: receiptNumber,
            message: 'Donation recorded successfully'
        });
        
    } catch (error) {
        console.error('Donation Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Donation failed'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;

