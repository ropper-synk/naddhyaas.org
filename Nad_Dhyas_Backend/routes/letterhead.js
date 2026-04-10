const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/letterheads');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'letterhead-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /pdf|png|jpeg|jpg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF and image files (PNG, JPEG, JPG) are allowed!'));
        }
    }
});

// Ensure letterheads table exists
async function ensureTableExists() {
    const connection = await pool.getConnection();
    try {
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS letterheads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT NULL,
                file_url VARCHAR(500) NOT NULL,
                file_type VARCHAR(50) NOT NULL,
                file_size BIGINT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_is_active (is_active),
                INDEX idx_created_at (created_at)
            )
        `);
    } catch (error) {
        console.error('Error creating letterheads table:', error);
    } finally {
        connection.release();
    }
}

// Initialize table on module load
ensureTableExists();

// GET /api/letterhead - Get all letterheads
router.get('/', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const [letterheads] = await connection.execute(`
            SELECT id, name, description, file_url, file_type, file_size, is_active, created_at, updated_at
            FROM letterheads
            ORDER BY is_active DESC, created_at DESC
        `);

        res.json({
            success: true,
            letterheads: letterheads
        });
    } catch (error) {
        console.error('Error fetching letterheads:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch letterheads'
        });
    } finally {
        connection.release();
    }
});

// POST /api/letterhead - Upload new letterhead
router.post('/', upload.single('file'), async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { name, description, is_active } = req.body;

        if (!name || !req.file) {
            return res.status(400).json({
                success: false,
                error: 'Name and file are required'
            });
        }

        // If setting this as active, deactivate all other letterheads
        if (is_active === 'true' || is_active === true) {
            await connection.execute(
                'UPDATE letterheads SET is_active = FALSE WHERE is_active = TRUE'
            );
        }

        const fileUrl = `/uploads/letterheads/${req.file.filename}`;
        const fileType = req.file.mimetype;
        const fileSize = req.file.size;

        const [result] = await connection.execute(`
            INSERT INTO letterheads (name, description, file_url, file_type, file_size, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, description || null, fileUrl, fileType, fileSize, is_active === 'true' || is_active === true]);

        res.status(201).json({
            success: true,
            id: result.insertId,
            message: 'Letterhead uploaded successfully'
        });
    } catch (error) {
        console.error('Error uploading letterhead:', error);
        
        // Delete uploaded file if database insert failed
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload letterhead'
        });
    } finally {
        connection.release();
    }
});

// PUT /api/letterhead/:id - Update letterhead
router.put('/:id', upload.single('file'), async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const letterheadId = req.params.id;
        const { name, description, is_active } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Name is required'
            });
        }

        // Check if letterhead exists
        const [existing] = await connection.execute(
            'SELECT * FROM letterheads WHERE id = ?',
            [letterheadId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Letterhead not found'
            });
        }

        // If setting this as active, deactivate all other letterheads
        if (is_active === 'true' || is_active === true) {
            await connection.execute(
                'UPDATE letterheads SET is_active = FALSE WHERE is_active = TRUE AND id != ?',
                [letterheadId]
            );
        }

        let fileUrl = existing[0].file_url;
        let fileType = existing[0].file_type;
        let fileSize = existing[0].file_size;

        // If new file uploaded, delete old file and update file info
        if (req.file) {
            // Delete old file
            const oldFilePath = path.join(__dirname, '..', existing[0].file_url);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }

            fileUrl = `/uploads/letterheads/${req.file.filename}`;
            fileType = req.file.mimetype;
            fileSize = req.file.size;
        }

        await connection.execute(`
            UPDATE letterheads
            SET name = ?, description = ?, file_url = ?, file_type = ?, file_size = ?, is_active = ?
            WHERE id = ?
        `, [name, description || null, fileUrl, fileType, fileSize, is_active === 'true' || is_active === true, letterheadId]);

        res.json({
            success: true,
            message: 'Letterhead updated successfully'
        });
    } catch (error) {
        console.error('Error updating letterhead:', error);
        
        // Delete uploaded file if database update failed
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update letterhead'
        });
    } finally {
        connection.release();
    }
});

// DELETE /api/letterhead/:id - Delete letterhead
router.delete('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const letterheadId = req.params.id;

        // Get letterhead to delete associated file
        const [letterheads] = await connection.execute(
            'SELECT file_url FROM letterheads WHERE id = ?',
            [letterheadId]
        );

        if (letterheads.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Letterhead not found'
            });
        }

        // Delete associated file
        const filePath = path.join(__dirname, '..', letterheads[0].file_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await connection.execute('DELETE FROM letterheads WHERE id = ?', [letterheadId]);

        res.json({
            success: true,
            message: 'Letterhead deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting letterhead:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete letterhead'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
