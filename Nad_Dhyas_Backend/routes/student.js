const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Branch to DO No prefix (branch-wise payment receipt number)
function getDoNoPrefix(branch) {
    if (!branch) return 'XX';
    const b = String(branch).toLowerCase().trim();
    if (b.includes('karmaveer') || b.includes('karamveer')) return 'S-KR';
    if (b.includes('godoli')) return 'S-GO';
    if (b.includes('krantismruti') || b.includes('krantismurti')) return 'S-KS';
    if (b.includes('karad')) return 'K-VA';
    return 'XX';
}

// Generate next DO No for a branch (call within transaction). Uses normalized key (S-KR, S-GO, S-KS, K-VA) so one counter per branch.
async function generateNextDoNo(branch, connection) {
    const prefix = getDoNoPrefix(branch);
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS do_no_sequence (
            branch VARCHAR(20) PRIMARY KEY,
            seq INT DEFAULT 0 NOT NULL
        )
    `);
    const [rows] = await connection.execute(
        'SELECT seq FROM do_no_sequence WHERE branch = ?',
        [prefix]
    );
    const nextSeq = rows.length > 0 ? rows[0].seq + 1 : 1;
    if (rows.length > 0) {
        await connection.execute(
            'UPDATE do_no_sequence SET seq = ? WHERE branch = ?',
            [nextSeq, prefix]
        );
    } else {
        await connection.execute(
            'INSERT INTO do_no_sequence (branch, seq) VALUES (?, ?)',
            [prefix, nextSeq]
        );
    }
    return `${prefix}-${nextSeq.toString().padStart(5, '0')}`;
}

// POST /api/student/login - Student login with Name and Contact Number
router.post('/login', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { name, phone } = req.body;
        
        console.log('Student login attempt:', { name: name ? '✓' : '✗', phone: phone ? '✓' : '✗' });
        
        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Name and Contact Number are required'
            });
        }
        
        // Search for student by name and phone number
        const [students] = await connection.execute(
            `SELECT admission_id, full_name, phone, email_id, branch, admission_date, form_no 
             FROM admission_form 
             WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(?)) AND phone = ?`,
            [name.trim(), phone.trim()]
        );
        
        if (students.length === 0) {
            console.log('Student not found:', name, phone);
            return res.status(401).json({
                success: false,
                error: 'Invalid Name or Contact Number'
            });
        }
        
        const student = students[0];
        console.log('Student login successful:', student.full_name);
        
        // Return success
        return res.json({
            success: true,
            studentId: student.admission_id,
            fullName: student.full_name,
            phone: student.phone,
            email: student.email_id || '',
            branch: student.branch,
            formNo: student.form_no
        });
        
    } catch (error) {
        console.error('Student Login Error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed. Please try again.'
        });
    } finally {
        connection.release();
    }
});

// GET /api/student/:id - Get student details
router.get('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const admissionId = parseInt(req.params.id);
        
        if (isNaN(admissionId)) {
            return res.status(400).json({ error: 'Invalid student ID' });
        }
        
        // Get student basic info
        const [admissions] = await connection.execute(
            `SELECT * FROM admission_form WHERE admission_id = ?`,
            [admissionId]
        );
        
        if (admissions.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const admission = admissions[0];
        
        // Get music preferences
        const [preferences] = await connection.execute(
            `SELECT * FROM music_preferences WHERE admission_id = ?`,
            [admissionId]
        );
        
        const preference = preferences[0] || {};
        
        // Get donation/fee info
        const [donations] = await connection.execute(
            `SELECT * FROM donation_fee WHERE admission_id = ? ORDER BY donation_id DESC LIMIT 1`,
            [admissionId]
        );
        
        const donation = donations[0];
        
        // Get total paid amount
        const [totalPaidResult] = await connection.execute(
            `SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM donation_fee WHERE admission_id = ?`,
            [admissionId]
        );
        
        const totalPaid = totalPaidResult[0]?.total_paid || 0;
        
        // Get payment history (including donation_id for individual invoices)
        let paymentHistory = [];
        try {
            const [history] = await connection.execute(
                `SELECT donation_id as donationId, amount_paid as amount, 
                        transaction_id as transactionId, 
                        payment_type as paymentType, 
                        COALESCE(created_at, NOW()) as paidDate
                 FROM donation_fee 
                 WHERE admission_id = ? 
                 ORDER BY donation_id DESC`,
                [admissionId]
            );
            paymentHistory = history;
        } catch (err) {
            // If created_at column doesn't exist, use simpler query
            console.log('Using fallback payment history query');
            const [history] = await connection.execute(
                `SELECT donation_id as donationId, amount_paid as amount, 
                        transaction_id as transactionId, 
                        payment_type as paymentType, 
                        NOW() as paidDate
                 FROM donation_fee 
                 WHERE admission_id = ? 
                 ORDER BY donation_id DESC`,
                [admissionId]
            );
            paymentHistory = history;
        }
        
        // Build course details
        const courseDetails = [];
        if (preference.instrumental_selection) {
            courseDetails.push(preference.instrumental_selection);
        }
        if (preference.indian_classical_vocal) {
            courseDetails.push(preference.indian_classical_vocal);
        }
        if (preference.dance) {
            courseDetails.push(preference.dance);
        }
        
        const musicType = courseDetails.length > 0 ? courseDetails.join(' + ') : 'N/A';
        
        // Calculate total fee based on year
        const totalFee = preference?.diploma_admission_year === 'Third Year' ? 12200 : 10200;
        
        const studentData = {
            admissionId: admission.admission_id,
            fullName: admission.full_name,
            address: admission.address,
            phone: admission.phone,
            email: admission.email_id,
            dateOfBirth: admission.date_of_birth,
            age: admission.age,
            branch: admission.branch,
            admissionDate: admission.admission_date,
            formNo: admission.form_no,
            panCard: admission.pan_card,
            aadharCard: admission.aadhar_card,
            photo: admission.photo,
            musicType: musicType,
            instrumental: preference?.instrumental_selection || null,
            vocal: preference?.indian_classical_vocal || null,
            dance: preference?.dance || null,
            diplomaAdmissionYear: preference?.diploma_admission_year || 'First Year',
            joiningDate: preference?.joining_date || null,
            educationalActivities: preference?.education_job_details || null,
            amountPaid: totalPaid || 0,
            totalFee: totalFee,
            remainingFee: Math.max(0, totalFee - (totalPaid || 0)),
            transactionId: donation?.transaction_id || null,
            paymentType: donation?.payment_type || null,
            paymentHistory: paymentHistory || []
        };
        
        console.log('Student data fetched:', {
            admissionId: studentData.admissionId,
            totalFee: studentData.totalFee,
            amountPaid: studentData.amountPaid,
            remainingFee: studentData.remainingFee,
            paymentCount: paymentHistory.length
        });
        
        // Set cache-control headers to prevent caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        
        res.json(studentData);
        
    } catch (error) {
        console.error('Student Data Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch student data' });
    } finally {
        connection.release();
    }
});

// POST /api/student/:id/payment - Make fee payment
router.post('/:id/payment', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const admissionId = parseInt(req.params.id);
        const { amount, transactionId, paymentType } = req.body;
        
        if (isNaN(admissionId)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid admission ID' 
            });
        }
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Valid payment amount is required' 
            });
        }
        
        if (!transactionId || !transactionId.trim()) {
            return res.status(400).json({ 
                success: false,
                error: 'Transaction ID is required' 
            });
        }
        
        // Verify student exists and get branch for DO No
        const [students] = await connection.execute(
            `SELECT admission_id, branch FROM admission_form WHERE admission_id = ?`,
            [admissionId]
        );
        
        if (students.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Student not found' 
            });
        }
        
        const studentBranch = students[0].branch || '';
        
        // Get student's year to determine total fee
        const [preferences] = await connection.execute(
            `SELECT diploma_admission_year FROM music_preferences WHERE admission_id = ?`,
            [admissionId]
        );
        
        const diplomaYear = preferences[0]?.diploma_admission_year;
        const totalCourseFee = diplomaYear === 'Third Year' ? 12200 : 10200;
        
        // Get current total paid
        const [currentPayments] = await connection.execute(
            `SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM donation_fee WHERE admission_id = ?`,
            [admissionId]
        );
        
        const currentTotal = parseFloat(currentPayments[0].total_paid) || 0;
        const newTotal = currentTotal + parseFloat(amount);
        
        // Check if total exceeds course fee
        if (newTotal > totalCourseFee) {
            return res.status(400).json({ 
                success: false,
                error: `Payment amount exceeds remaining fee. Remaining fee is ₹${(totalCourseFee - currentTotal).toFixed(2)}` 
            });
        }
        
        // Ensure do_no column exists on donation_fee
        try {
            await connection.execute(
                'ALTER TABLE donation_fee ADD COLUMN do_no VARCHAR(20) NULL UNIQUE'
            );
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }
        
        await connection.beginTransaction();
        let doNo;
        let insertId;
        try {
            doNo = await generateNextDoNo(studentBranch, connection);
            const [insertResult] = await connection.execute(
                `INSERT INTO donation_fee (admission_id, amount_paid, transaction_id, payment_type, do_no)
                 VALUES (?, ?, ?, ?, ?)`,
                [admissionId, parseFloat(amount), transactionId.trim(), paymentType || '3 Installments', doNo]
            );
            insertId = insertResult.insertId;
            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        }
        
        console.log('Payment inserted successfully:', {
            admissionId,
            donationId: insertId,
            doNo,
            amount: parseFloat(amount),
            transactionId: transactionId.trim(),
            previousTotal: currentTotal,
            newTotal: newTotal,
            remainingFee: totalCourseFee - newTotal
        });
        
        res.json({
            success: true,
            message: 'Payment recorded successfully',
            totalPaid: newTotal,
            remainingFee: totalCourseFee - newTotal,
            donationId: insertId,
            doNo
        });
        
    } catch (error) {
        console.error('Payment Error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to record payment' 
        });
    } finally {
        connection.release();
    }
});

// DELETE /api/student/invoices/:donationId - Delete own invoice (payment record) - student must send admissionId in body
router.delete('/invoices/:donationId', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const donationId = parseInt(req.params.donationId, 10);
        const { admissionId } = req.body || {};
        if (isNaN(donationId) || !admissionId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid donation ID or admission ID required'
            });
        }
        const [rows] = await connection.execute(
            'SELECT donation_id, admission_id FROM donation_fee WHERE donation_id = ? AND admission_id = ?',
            [donationId, admissionId]
        );
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invoice not found or you do not have permission to delete it'
            });
        }
        await connection.execute('DELETE FROM donation_fee WHERE donation_id = ? AND admission_id = ?', [
            donationId,
            admissionId,
        ]);
        res.json({
            success: true,
            message: 'Invoice deleted successfully',
            deletedId: donationId,
        });
    } catch (error) {
        console.error('Student delete invoice error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete invoice',
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
