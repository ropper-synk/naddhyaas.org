const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/invoice/transaction/:donationId - Get invoice for a specific transaction
router.get('/transaction/:donationId', async (req, res) => {
    try {
        const donationId = parseInt(req.params.donationId);
        
        console.log(`[TRANSACTION INVOICE] 🔍 Received request for donation ID: ${req.params.donationId}`);
        
        if (isNaN(donationId)) {
            console.log(`[TRANSACTION INVOICE] ❌ Invalid donation ID: ${req.params.donationId}`);
            return res.status(400).json({ error: 'Invalid donation ID' });
        }
        
        // Get the specific payment/donation record
        const [donations] = await pool.execute(
            `SELECT * FROM donation_fee WHERE donation_id = ?`,
            [donationId]
        );
        
        if (donations.length === 0) {
            console.log(`[TRANSACTION INVOICE] ❌ Donation not found for ID: ${donationId}`);
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        const donation = donations[0];
        const admissionId = donation.admission_id;
        
        console.log(`[TRANSACTION INVOICE] 📋 Found donation for admission ID: ${admissionId}`);
        
        // Get admission form data
        const [admissions] = await pool.execute(
            `SELECT * FROM admission_form WHERE admission_id = ?`,
            [admissionId]
        );
        
        if (admissions.length === 0) {
            console.log(`[TRANSACTION INVOICE] ❌ Student not found for admission ID: ${admissionId}`);
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const admission = admissions[0];
        
        // Get music preferences
        const [preferences] = await pool.execute(
            `SELECT * FROM music_preferences WHERE admission_id = ?`,
            [admissionId]
        );
        
        const preference = preferences.length > 0 ? preferences[0] : null;
        
        // Build course description
        const courseDetails = [];
        if (preference) {
            if (preference.instrumental_selection) {
                courseDetails.push(preference.instrumental_selection);
            }
            if (preference.indian_classical_vocal) {
                courseDetails.push(preference.indian_classical_vocal);
            }
            if (preference.dance) {
                courseDetails.push(preference.dance);
            }
        }
        
        const musicType = courseDetails.length > 0 ? courseDetails.join(' + ') : 'N/A';
        
        // DO No is branch-wise auto-generated at payment creation (stored on donation_fee)
        const doNo = donation.do_no || null;
        
        const invoiceData = {
            fullName: admission.full_name,
            doNo,
            createdAt: admission.admission_date,
            branch: admission.branch,
            formNo: admission.form_no || null,
            panCard: admission.pan_card || null,
            aadharCard: admission.aadhar_card || null,
            phone: admission.phone || null,
            diplomaAdmissionYear: preference?.diploma_admission_year || null,
            musicType: musicType,
            instruments: preference?.instrumental_selection ? [preference.instrumental_selection] : [],
            vocalStyle: preference?.indian_classical_vocal || null,
            danceStyles: preference?.dance ? [preference.dance] : [],
            amountPaid: donation.amount_paid,
            transactionId: donation.transaction_id || null,
            paymentType: donation.payment_type || null,
            donationId: donationId
        };
        
        console.log(`[TRANSACTION INVOICE] ✅ Generated invoice for donation ${donationId}: Amount = ₹${donation.amount_paid}`);
        
        // Set no-cache headers
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
        
        res.json(invoiceData);
        
    } catch (error) {
        console.error('[TRANSACTION INVOICE] Error:', error);
        res.status(500).json({ error: 'Failed to fetch transaction invoice' });
    }
});

// GET /api/invoice/:id - Get invoice data for a student
router.get('/:id', async (req, res) => {
    try {
        const admissionId = parseInt(req.params.id);
        
        console.log(`[INVOICE] 🔍 Received request for admission ID: ${req.params.id}`);
        
        if (isNaN(admissionId)) {
            console.log(`[INVOICE] ❌ Invalid admission ID: ${req.params.id}`);
            return res.status(400).json({ error: 'Invalid admission ID' });
        }
        
        console.log(`[INVOICE] 📋 Querying admission_form for ID: ${admissionId}`);
        
        // Get admission form data
        const [admissions] = await pool.execute(
            `SELECT * FROM admission_form WHERE admission_id = ?`,
            [admissionId]
        );
        
        console.log(`[INVOICE] 📋 Found ${admissions.length} admission record(s)`);
        
        if (admissions.length === 0) {
            console.log(`[INVOICE] ❌ Student not found in database for ID: ${admissionId}`);
            
            // Check if ANY students exist
            const [allStudents] = await pool.execute(`SELECT COUNT(*) as count FROM admission_form`);
            console.log(`[INVOICE] 📊 Total students in database: ${allStudents[0].count}`);
            
            // Show some existing IDs for reference
            if (allStudents[0].count > 0) {
                const [sampleIds] = await pool.execute(
                    `SELECT admission_id, full_name FROM admission_form ORDER BY admission_id DESC LIMIT 5`
                );
                console.log(`[INVOICE] 💡 Recent student IDs:`, sampleIds.map(s => ({ id: s.admission_id, name: s.full_name })));
            }
            
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const admission = admissions[0];
        
        // Get music preferences
        const [preferences] = await pool.execute(
            `SELECT * FROM music_preferences WHERE admission_id = ?`,
            [admissionId]
        );
        
        const preference = preferences.length > 0 ? preferences[0] : null;
        
        // Get donation/fee information - SUM all payments
        const [totalPaidResult] = await pool.execute(
            `SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM donation_fee WHERE admission_id = ?`,
            [admissionId]
        );
        
        const totalPaid = totalPaidResult[0]?.total_paid || 0;
        
        // Debug: Get all payments for this student (without created_at as it may not exist)
        const [allPayments] = await pool.execute(
            `SELECT donation_id, amount_paid, transaction_id, payment_type 
             FROM donation_fee WHERE admission_id = ? ORDER BY donation_id`,
            [admissionId]
        );
        
        console.log(`[INVOICE] Admission ${admissionId} - All Payments:`, allPayments);
        console.log(`[INVOICE] Total Paid: ₹${totalPaid} (from ${allPayments.length} payment(s))`);
        
        // Get latest donation record for transaction details
        const [donations] = await pool.execute(
            `SELECT * FROM donation_fee WHERE admission_id = ? ORDER BY donation_id DESC LIMIT 1`,
            [admissionId]
        );
        
        const donation = donations.length > 0 ? donations[0] : null;
        
        // Build course description
        const courseDetails = [];
        if (preference) {
            if (preference.instrumental_selection) {
                courseDetails.push(preference.instrumental_selection);
            }
            if (preference.indian_classical_vocal) {
                courseDetails.push(preference.indian_classical_vocal);
            }
            if (preference.dance) {
                courseDetails.push(preference.dance);
            }
        }
        
        const musicType = courseDetails.length > 0 ? courseDetails.join(' + ') : 'N/A';
        
        // Generate invoice number
        const invoiceNumber = `INV-${admissionId}-${Date.now().toString().slice(-6)}`;
        
        const invoiceData = {
            fullName: admission.full_name,
            invoiceNumber: invoiceNumber,
            createdAt: admission.admission_date,
            branch: admission.branch,
            formNo: admission.form_no || null,
            panCard: admission.pan_card || null,
            aadharCard: admission.aadhar_card || null,
            phone: admission.phone || null,
            diplomaAdmissionYear: preference?.diploma_admission_year || null,
            musicType: musicType,
            instruments: preference?.instrumental_selection ? [preference.instrumental_selection] : [],
            vocalStyle: preference?.indian_classical_vocal || null,
            danceStyles: preference?.dance ? [preference.dance] : [],
            amountPaid: totalPaid, // Use total of all payments
            transactionId: donation?.transaction_id || null,
            paymentType: donation?.payment_type || null
        };
        
        console.log(`[INVOICE] Generated for admission ${admissionId}: Total Paid = ₹${totalPaid}`);
        
        // Set no-cache headers to prevent browser caching
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
        
        res.json(invoiceData);
        
    } catch (error) {
        console.error('Invoice Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

module.exports = router;

