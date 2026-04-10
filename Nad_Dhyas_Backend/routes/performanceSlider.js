const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/performance-slider');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'slider-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.test(ext) && /image/.test(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed.'));
    }
});

async function ensureTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS performance_slider_images (
            id INT AUTO_INCREMENT PRIMARY KEY,
            image_url VARCHAR(500) NOT NULL,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_sort (sort_order)
        )
    `);
}

// GET /api/performance-slider - list all slider images (public)
router.get('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await ensureTable(connection);
        const [rows] = await connection.execute(
            'SELECT id, image_url, sort_order, created_at FROM performance_slider_images ORDER BY sort_order ASC, id ASC'
        );
        res.json({ success: true, images: rows });
    } catch (err) {
        console.error('Performance slider GET error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch slider images' });
    } finally {
        connection.release();
    }
});

// POST /api/performance-slider - upload one image (admin)
router.post('/', upload.single('image'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image file provided' });
        }
        await ensureTable(connection);
        const imageUrl = `/uploads/performance-slider/${req.file.filename}`;
        const [maxOrder] = await connection.execute(
            'SELECT COALESCE(MAX(sort_order), 0) AS mx FROM performance_slider_images'
        );
        const sortOrder = (maxOrder[0]?.mx ?? 0) + 1;
        await connection.execute(
            'INSERT INTO performance_slider_images (image_url, sort_order) VALUES (?, ?)',
            [imageUrl, sortOrder]
        );
        const [inserted] = await connection.execute(
            'SELECT id, image_url, sort_order, created_at FROM performance_slider_images ORDER BY id DESC LIMIT 1'
        );
        res.status(201).json({
            success: true,
            image: inserted[0],
            message: 'Image added to slider'
        });
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Performance slider POST error:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to add image' });
    } finally {
        connection.release();
    }
});

// DELETE /api/performance-slider/:id
router.delete('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const id = req.params.id;
        const [rows] = await connection.execute(
            'SELECT image_url FROM performance_slider_images WHERE id = ?',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Image not found' });
        }
        const filePath = path.join(__dirname, '..', rows[0].image_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await connection.execute('DELETE FROM performance_slider_images WHERE id = ?', [id]);
        res.json({ success: true, message: 'Image removed from slider' });
    } catch (err) {
        console.error('Performance slider DELETE error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete image' });
    } finally {
        connection.release();
    }
});

module.exports = router;
