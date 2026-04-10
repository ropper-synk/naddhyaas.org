const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/expenses');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'expense-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (jpeg, jpg, png, gif) and PDF files are allowed!'));
        }
    }
});

// Get next Sr. No. (001, 002, 003...). Uses counter table so after you delete records, next add still gets next number (e.g. 004), not 001.
async function getNextSrNo(connection) {
    try {
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS expense_sr_counters (
                counter_id INT AUTO_INCREMENT PRIMARY KEY,
                seq INT DEFAULT 0 NOT NULL
            )
        `);
    } catch (err) {}

    const [counters] = await connection.execute(
        'SELECT seq FROM expense_sr_counters ORDER BY counter_id DESC LIMIT 1'
    );
    const counterSeq = counters.length > 0 ? (counters[0].seq || 0) : 0;

    const [[maxRow]] = await connection.execute(
        'SELECT COALESCE(MAX(sr_no), 0) AS mx FROM expense_bills'
    );
    const maxSrNo = maxRow?.mx ?? 0;

    const seq = Math.max(counterSeq + 1, maxSrNo + 1);

    if (counters.length > 0) {
        await connection.execute(
            'UPDATE expense_sr_counters SET seq = ? ORDER BY counter_id DESC LIMIT 1',
            [seq]
        );
    } else {
        await connection.execute(
            'INSERT INTO expense_sr_counters (seq) VALUES (?)',
            [seq]
        );
    }

    return seq;
}

// Ensure expenses table exists and has sr_no column
async function ensureTableExists() {
    const connection = await pool.getConnection();
    try {
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS expense_bills (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sr_no INT NULL,
                description VARCHAR(500) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                date DATE NOT NULL,
                category VARCHAR(100) DEFAULT 'Other',
                vendor VARCHAR(200) NOT NULL,
                status ENUM('pending', 'paid') DEFAULT 'pending',
                notes TEXT NULL,
                bill_no VARCHAR(100) NULL,
                image_url VARCHAR(500) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_date (date),
                INDEX idx_status (status),
                INDEX idx_category (category),
                INDEX idx_sr_no (sr_no)
            )
        `);

        // Add sr_no if table already existed without it
        try {
            await connection.execute(`
                ALTER TABLE expense_bills 
                ADD COLUMN sr_no INT NULL
            `);
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }

        // Add bill_no column if it doesn't exist (for existing tables)
        try {
            await connection.execute(`
                ALTER TABLE expense_bills 
                ADD COLUMN IF NOT EXISTS bill_no VARCHAR(100) NULL
            `);
        } catch (error) {
            // Column might already exist, ignore error
        }

        // Backfill sr_no for existing rows and sync counter (one-time)
        const [rows] = await connection.execute(
            'SELECT id FROM expense_bills WHERE sr_no IS NULL ORDER BY id ASC'
        );
        if (rows.length > 0) {
            const [[maxSeqRow]] = await connection.execute(
                'SELECT COALESCE(MAX(sr_no), 0) AS mx FROM expense_bills'
            );
            let nextSeq = (maxSeqRow?.mx || 0) + 1;
            for (const row of rows) {
                await connection.execute(
                    'UPDATE expense_bills SET sr_no = ? WHERE id = ?',
                    [nextSeq++, row.id]
                );
            }
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS expense_sr_counters (
                    counter_id INT AUTO_INCREMENT PRIMARY KEY,
                    seq INT DEFAULT 0 NOT NULL
                )
            `);
            const [[c]] = await connection.execute('SELECT seq FROM expense_sr_counters ORDER BY counter_id DESC LIMIT 1');
            if (!c || c.seq < nextSeq - 1) {
                await connection.execute('DELETE FROM expense_sr_counters');
                await connection.execute('INSERT INTO expense_sr_counters (seq) VALUES (?)', [nextSeq - 1]);
            }
        }
    } catch (error) {
        console.error('Error creating expense_bills table:', error);
    } finally {
        connection.release();
    }
}

// Initialize table on module load
ensureTableExists();

// GET /api/expenses - Get all expenses
router.get('/', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const [expenses] = await connection.execute(`
            SELECT id, sr_no, description, amount, date, category, vendor, status, notes, bill_no, image_url, created_at, updated_at
            FROM expense_bills
            ORDER BY date DESC, created_at DESC
        `);

        // Ensure amounts are numbers (MySQL DECIMAL returns as string)
        const formattedExpenses = expenses.map(expense => ({
            ...expense,
            amount: parseFloat(expense.amount) || 0,
            sr_no: expense.sr_no != null ? expense.sr_no : null
        }));

        res.json({
            success: true,
            expenses: formattedExpenses
        });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch expenses'
        });
    } finally {
        connection.release();
    }
});

// POST /api/expenses - Create new expense
router.post('/', upload.single('image'), async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { description, amount, date, category, vendor, status, notes, billNo } = req.body;

        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Description is required'
            });
        }

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid amount greater than 0 is required'
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date is required'
            });
        }

        if (!vendor || !vendor.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Vendor is required'
            });
        }

        const amountValue = parseFloat(amount);
        if (isNaN(amountValue) || amountValue <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be a valid positive number'
            });
        }

        let imageUrl = null;
        if (req.file) {
            // Store relative path - frontend will prepend backend URL
            imageUrl = `/uploads/expenses/${req.file.filename}`;
        }

        // Sr. No.: next sequence (001, 002, 003...). Deletions do not change existing Sr. Nos.
        const srNo = await getNextSrNo(connection);

        const [result] = await connection.execute(`
            INSERT INTO expense_bills (sr_no, description, amount, date, category, vendor, status, notes, bill_no, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [srNo, description.trim(), amountValue, date, category || 'Other', vendor.trim(), status || 'pending', notes || null, billNo ? billNo.trim() : null, imageUrl]);

        res.status(201).json({
            success: true,
            id: result.insertId,
            sr_no: srNo,
            message: 'Expense bill created successfully'
        });
    } catch (error) {
        console.error('Error creating expense:', error);
        
        // Delete uploaded file if database insert failed
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to create expense bill'
        });
    } finally {
        connection.release();
    }
});

// PUT /api/expenses/:id - Update expense
router.put('/:id', upload.single('image'), async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const expenseId = req.params.id;
        const { description, amount, date, category, vendor, status, notes, billNo } = req.body;

        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Description is required'
            });
        }

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid amount greater than 0 is required'
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date is required'
            });
        }

        if (!vendor || !vendor.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Vendor is required'
            });
        }

        const amountValue = parseFloat(amount);
        if (isNaN(amountValue) || amountValue <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be a valid positive number'
            });
        }

        // Get existing expense to delete old image if new one is uploaded
        const [existing] = await connection.execute(
            'SELECT image_url FROM expense_bills WHERE id = ?',
            [expenseId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Expense bill not found'
            });
        }

        let imageUrl = existing[0].image_url;
        
        if (req.file) {
            // Delete old image if it exists
            if (imageUrl) {
                const oldImagePath = path.join(__dirname, '..', imageUrl);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            
            imageUrl = `/uploads/expenses/${req.file.filename}`;
        }

        // Do not update sr_no - it remains fixed for the lifetime of the expense
        await connection.execute(`
            UPDATE expense_bills
            SET description = ?, amount = ?, date = ?, category = ?, vendor = ?, status = ?, notes = ?, bill_no = ?, image_url = ?
            WHERE id = ?
        `, [description.trim(), amountValue, date, category || 'Other', vendor.trim(), status || 'pending', notes || null, billNo ? billNo.trim() : null, imageUrl, expenseId]);

        res.json({
            success: true,
            message: 'Expense bill updated successfully'
        });
    } catch (error) {
        console.error('Error updating expense:', error);
        
        // Delete uploaded file if database update failed
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to update expense bill'
        });
    } finally {
        connection.release();
    }
});

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const expenseId = req.params.id;

        // Get expense to delete associated image
        const [expenses] = await connection.execute(
            'SELECT image_url FROM expense_bills WHERE id = ?',
            [expenseId]
        );

        if (expenses.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Expense bill not found'
            });
        }

        // Delete associated image file
        if (expenses[0].image_url) {
            const imagePath = path.join(__dirname, '..', expenses[0].image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await connection.execute('DELETE FROM expense_bills WHERE id = ?', [expenseId]);

        res.json({
            success: true,
            message: 'Expense bill deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete expense bill'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
