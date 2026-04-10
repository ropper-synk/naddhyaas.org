const express = require('express');
const router = express.Router();
const pool = require('../config/database');

async function ensureTables(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS examination_settings (
            id INT PRIMARY KEY DEFAULT 1,
            form_enabled TINYINT(1) DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    const [existing] = await connection.execute('SELECT 1 FROM examination_settings WHERE id = 1');
    if (existing.length === 0) {
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
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS exam_registrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            exam_form_no VARCHAR(20) NULL UNIQUE,
            admission_id INT NULL UNIQUE,
            full_name VARCHAR(150) NOT NULL,
            photo TEXT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(255) NOT NULL,
            branch VARCHAR(150) NULL,
            diploma_year VARCHAR(50) NULL,
            instrumental_subject VARCHAR(100) NULL,
            vocal_subject VARCHAR(100) NULL,
            dance_subject VARCHAR(100) NULL,
            exam_fee_amount DECIMAL(10,2) NULL,
            transaction_id VARCHAR(150) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    try {
        await connection.execute('SELECT admission_id FROM exam_registrations LIMIT 1');
    } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') {
            await connection.execute('ALTER TABLE exam_registrations ADD COLUMN admission_id INT NULL UNIQUE AFTER id');
        }
    }
    try {
        await connection.execute('SELECT branch FROM exam_registrations LIMIT 1');
    } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') {
            await connection.execute('ALTER TABLE exam_registrations ADD COLUMN branch VARCHAR(150) NULL AFTER email');
        }
    }
    try {
        await connection.execute('SELECT exam_form_no FROM exam_registrations LIMIT 1');
    } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') {
            await connection.execute('ALTER TABLE exam_registrations ADD COLUMN exam_form_no VARCHAR(20) NULL UNIQUE AFTER id');
            const [rows] = await connection.execute('SELECT id FROM exam_registrations ORDER BY id');
            for (const row of rows) {
                const no = 'EXF-' + String(row.id).padStart(5, '0');
                await connection.execute('UPDATE exam_registrations SET exam_form_no = ? WHERE id = ?', [no, row.id]);
            }
        }
    }
}

// GET /api/examination - Public: get list of exam info items, form enabled, and optionally alreadySubmitted for a student (query: studentId)
router.get('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await ensureTables(connection);
        const studentId = req.query.studentId ? String(req.query.studentId).trim() : null;
        const [settingsRows] = await connection.execute(
            'SELECT form_enabled FROM examination_settings WHERE id = 1'
        );
        const formEnabled = settingsRows[0] ? Boolean(settingsRows[0].form_enabled) : false;
        const [infoRows] = await connection.execute(
            'SELECT id, title, content, exam_date, updated_at FROM examination_info ORDER BY sort_order ASC, id ASC'
        );
        const items = (infoRows || []).map((r) => ({
            id: r.id,
            title: r.title || '',
            content: r.content || '',
            examDate: r.exam_date || null,
            updatedAt: r.updated_at || null
        }));
        let alreadySubmitted = false;
        if (studentId) {
            const [existing] = await connection.execute(
                'SELECT 1 FROM exam_registrations WHERE admission_id = ?',
                [parseInt(studentId, 10)]
            );
            alreadySubmitted = existing.length > 0;
        }
        res.json({
            success: true,
            formEnabled,
            alreadySubmitted,
            items
        });
    } catch (err) {
        console.error('Examination GET error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch examination info' });
    } finally {
        connection.release();
    }
});

// PUT /api/examination - Update exam registration form visibility (formEnabled on/off). Used by admin panel.
router.put('/', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { formEnabled } = req.body || {};
        await ensureTables(connection);
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
        console.error('Examination PUT error:', err);
        res.status(500).json({ success: false, error: 'Failed to update setting' });
    } finally {
        connection.release();
    }
});

// GET /api/examination/registration?studentId= - Get submitted exam form details for a student (for PDF download)
router.get('/registration', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const studentId = req.query.studentId ? String(req.query.studentId).trim() : null;
        if (!studentId) {
            return res.status(400).json({ success: false, error: 'Student ID required' });
        }
        const admId = parseInt(studentId, 10);
        if (isNaN(admId)) {
            return res.status(400).json({ success: false, error: 'Invalid student ID' });
        }
        await ensureTables(connection);
        const [rows] = await connection.execute(
            'SELECT id, exam_form_no, admission_id, full_name, photo, phone, email, branch, diploma_year, instrumental_subject, vocal_subject, dance_subject, exam_fee_amount, transaction_id, created_at FROM exam_registrations WHERE admission_id = ?',
            [admId]
        );
        const row = rows[0];
        if (!row) {
            return res.status(404).json({ success: false, error: 'Exam registration not found' });
        }
        res.json({
            success: true,
            registration: {
                id: row.id,
                examFormNo: row.exam_form_no || null,
                admissionId: row.admission_id,
                fullName: row.full_name || '',
                photo: row.photo || null,
                phone: row.phone || '',
                email: row.email || '',
                branch: row.branch || null,
                diplomaYear: row.diploma_year || null,
                instrumentalSubject: row.instrumental_subject || null,
                vocalSubject: row.vocal_subject || null,
                danceSubject: row.dance_subject || null,
                examFeeAmount: row.exam_fee_amount != null ? parseFloat(row.exam_fee_amount) : null,
                transactionId: row.transaction_id || null,
                createdAt: row.created_at || null
            }
        });
    } catch (err) {
        console.error('Examination registration GET error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch registration' });
    } finally {
        connection.release();
    }
});

// POST /api/examination - Add exam info (admin) when body has title; otherwise submit exam form (public)
router.post('/', async (req, res, next) => {
    const body = req.body || {};
    const looksLikeAddExamInfo = body.title != null && body.fullName == null && body.phone == null;
    if (looksLikeAddExamInfo) {
        return addExamInfoHandler(req, res);
    }
    next();
}, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const {
            admissionId,
            fullName,
            photo,
            phone,
            email,
            branch,
            diplomaYear,
            instrumentalSubject,
            vocalSubject,
            danceSubject,
            examFeeAmount,
            transactionId
        } = req.body || {};
        await ensureTables(connection);
        const [settings] = await connection.execute(
            'SELECT form_enabled FROM examination_settings WHERE id = 1'
        );
        if (!settings[0] || !settings[0].form_enabled) {
            return res.status(400).json({ success: false, error: 'Exam form is currently not accepting submissions.' });
        }
        const admId = admissionId != null ? parseInt(admissionId, 10) : null;
        if (admId && !isNaN(admId)) {
            const [existing] = await connection.execute(
                'SELECT 1 FROM exam_registrations WHERE admission_id = ?',
                [admId]
            );
            if (existing.length > 0) {
                return res.status(400).json({ success: false, error: 'You have already submitted the exam form. Each student can submit only once.' });
            }
        }
        if (!fullName || !String(fullName).trim()) {
            return res.status(400).json({ success: false, error: 'Full name is required.' });
        }
        if (!email || !String(email).trim()) {
            return res.status(400).json({ success: false, error: 'Email is required.' });
        }
        if (!phone || !String(phone).trim()) {
            return res.status(400).json({ success: false, error: 'Contact number is required.' });
        }
        const feeAmount = examFeeAmount != null ? parseFloat(examFeeAmount) : null;
        const [insertResult] = await connection.execute(
            `INSERT INTO exam_registrations (admission_id, full_name, photo, phone, email, branch, diploma_year, instrumental_subject, vocal_subject, dance_subject, exam_fee_amount, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                admId && !isNaN(admId) ? admId : null,
                String(fullName).trim(),
                photo ? String(photo) : null,
                String(phone).trim(),
                String(email).trim(),
                branch ? String(branch).trim() : null,
                diplomaYear ? String(diplomaYear).trim() : null,
                instrumentalSubject ? String(instrumentalSubject).trim() : null,
                vocalSubject ? String(vocalSubject).trim() : null,
                danceSubject ? String(danceSubject).trim() : null,
                feeAmount,
                transactionId ? String(transactionId).trim() : null
            ]
        );
        const newId = insertResult.insertId;
        const examFormNo = 'EXF-' + String(newId).padStart(5, '0');
        await connection.execute('UPDATE exam_registrations SET exam_form_no = ? WHERE id = ?', [examFormNo, newId]);
        res.status(201).json({ success: true, message: 'Exam form submitted successfully.', examFormNo });
    } catch (err) {
        console.error('Examination POST error:', err);
        res.status(500).json({ success: false, error: 'Failed to submit exam form' });
    } finally {
        connection.release();
    }
});

// ==========================================
// Exam info management (admin-style; also under /api/admin/examination)
// ==========================================

// POST /api/examination/info or /api/examination/add - Add exam info item
const addExamInfoHandler = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { title, content, examDate } = req.body || {};
        await ensureTables(connection);
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
        console.error('Examination POST info error:', err);
        res.status(500).json({ success: false, error: 'Failed to add exam info' });
    } finally {
        connection.release();
    }
};
router.post('/info', addExamInfoHandler);
router.post('/add', addExamInfoHandler);

// PUT /api/examination/info/reorder - Reorder exam info items (body: { order: [id1, id2, ...] })
router.put('/info/reorder', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { order } = req.body || {};
        if (!Array.isArray(order) || order.length === 0) {
            return res.status(400).json({ success: false, error: 'Order array is required' });
        }
        await ensureTables(connection);
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
        console.error('Examination reorder error:', err);
        res.status(500).json({ success: false, error: 'Failed to reorder' });
    } finally {
        connection.release();
    }
});

// PUT /api/examination/info/:id - Update exam info item
router.put('/info/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 1) {
            return res.status(400).json({ success: false, error: 'Invalid id' });
        }
        const { title, content, examDate } = req.body || {};
        await ensureTables(connection);
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
        console.error('Examination PUT info error:', err);
        res.status(500).json({ success: false, error: 'Failed to update exam info' });
    } finally {
        connection.release();
    }
});

// DELETE /api/examination/info/:id - Delete exam info item
router.delete('/info/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 1) {
            return res.status(400).json({ success: false, error: 'Invalid id' });
        }
        await ensureTables(connection);
        const [result] = await connection.execute('DELETE FROM examination_info WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Exam info not found' });
        }
        res.json({ success: true, message: 'Exam info deleted' });
    } catch (err) {
        console.error('Examination DELETE info error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete exam info' });
    } finally {
        connection.release();
    }
});

module.exports = router;
