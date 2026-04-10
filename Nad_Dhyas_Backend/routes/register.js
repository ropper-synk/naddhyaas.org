const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

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

// Helper function to get branch table name based on branch selection
function getBranchTableName(branch) {
    const branchLower = branch.toLowerCase();
    if (branchLower.includes('karmaveer') || branchLower.includes('karamveer')) {
        return 'karmaveer_nagar_table';
    }
    if (branchLower.includes('godoli')) {
        return 'godoli_satara_table';
    }
    if (branchLower.includes('krantismruti') || branchLower.includes('krantismurti')) {
        return 'krantismruti_satara_table';
    }
    if (branchLower.includes('karad')) {
        return 'karad_table';
    }
    return null; // No branch table for other branches
}

// Helper function to get branch music preferences table name
function getBranchMusicPrefsTable(branch) {
    const branchLower = branch.toLowerCase();
    if (branchLower.includes('karmaveer') || branchLower.includes('karamveer')) {
        return 'karmaveer_nagar_music_preferences';
    }
    if (branchLower.includes('godoli')) {
        return 'godoli_satara_music_preferences';
    }
    if (branchLower.includes('krantismruti') || branchLower.includes('krantismurti')) {
        return 'krantismruti_satara_music_preferences';
    }
    if (branchLower.includes('karad')) {
        return 'karad_music_preferences';
    }
    return null;
}

// Helper function to get branch donation fee table name
function getBranchDonationFeeTable(branch) {
    const branchLower = branch.toLowerCase();
    if (branchLower.includes('karmaveer') || branchLower.includes('karamveer')) {
        return 'karmaveer_nagar_donation_fee';
    }
    if (branchLower.includes('godoli')) {
        return 'godoli_satara_donation_fee';
    }
    if (branchLower.includes('krantismruti') || branchLower.includes('krantismurti')) {
        return 'krantismruti_satara_donation_fee';
    }
    if (branchLower.includes('karad')) {
        return 'karad_donation_fee';
    }
    return null;
}

// Helper function to get branch signatures table name
function getBranchSignaturesTable(branch) {
    const branchLower = branch.toLowerCase();
    if (branchLower.includes('karmaveer') || branchLower.includes('karamveer')) {
        return 'karmaveer_nagar_signatures';
    }
    if (branchLower.includes('godoli')) {
        return 'godoli_satara_signatures';
    }
    if (branchLower.includes('krantismruti') || branchLower.includes('krantismurti')) {
        return 'krantismruti_satara_signatures';
    }
    if (branchLower.includes('karad')) {
        return 'karad_signatures';
    }
    return null;
}

// Helper function to generate form number
async function generateFormNo(branch, connection) {
    const prefix = getFormPrefix(branch);
    
    // Ensure form_counters table exists
    try {
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS form_counters (
                branch VARCHAR(100) PRIMARY KEY,
                seq INT DEFAULT 0 NOT NULL
            )
        `);
    } catch (err) {
        // Table might already exist, continue
    }
    
    // Get or create counter for this branch
    const [counters] = await connection.execute(
        'SELECT seq FROM form_counters WHERE branch = ?',
        [branch]
    );
    
    let seq = 1;
    if (counters.length > 0) {
        seq = counters[0].seq + 1;
        await connection.execute(
            'UPDATE form_counters SET seq = ? WHERE branch = ?',
            [seq, branch]
        );
    } else {
        await connection.execute(
            'INSERT INTO form_counters (branch, seq) VALUES (?, ?)',
            [branch, seq]
        );
    }
    
    return `${prefix}-${seq.toString().padStart(4, '0')}`;
}

// DO No prefix by branch (same as Form prefix; independent sequence)
function getDoNoPrefix(branch) {
    if (!branch) return 'XX';
    const b = String(branch).toLowerCase().trim();
    if (b.includes('karmaveer') || b.includes('karamveer')) return 'S-KR';
    if (b.includes('godoli')) return 'S-GO';
    if (b.includes('krantismruti') || b.includes('krantismurti')) return 'S-KS';
    if (b.includes('karad')) return 'K-VA';
    return 'XX';
}

// Generate next DO No for payment (branch-wise, at payment creation only)
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

// POST /api/register - Register a new student
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const data = req.body;
        
        // Validate required fields
        if (!data.name || !data.branch || !data.Admissiondate || !data.transactionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, branch, Admissiondate, transactionId'
            });
        }
        
        // Generate form number
        const formNo = await generateFormNo(data.branch, connection);
        
        // Calculate age from DOB if provided
        let age = null;
        if (data.dob) {
            const dob = new Date(data.dob);
            const today = new Date();
            age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                age--;
            }
        } else if (data.age) {
            age = parseInt(data.age);
        }
        
        // Determine payment type for database
        const paymentType = data.paymentMode === 'full' 
            ? 'One Time Full Donation' 
            : '3 Installments';
        
        // Ensure form_no column exists in admission_form
        try {
            // Check if column exists by trying to select it
            await connection.execute(`SELECT form_no FROM admission_form LIMIT 1`);
        } catch (err) {
            // Column doesn't exist, add it
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                try {
                    await connection.execute(`
                        ALTER TABLE admission_form 
                        ADD COLUMN form_no VARCHAR(50) UNIQUE
                    `);
                } catch (alterErr) {
                    // Ignore if column already exists or other error
                    console.log('form_no column may already exist or error:', alterErr.message);
                }
            }
        }
        
        // Ensure pan_card, aadhar_card, and photo columns exist in admission_form
        try {
            await connection.execute(`SELECT pan_card, aadhar_card, photo FROM admission_form LIMIT 1`);
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                try {
                    // Check which columns are missing and add them
                    const columnsToAdd = [];
                    try {
                        await connection.execute(`SELECT pan_card FROM admission_form LIMIT 1`);
                    } catch (e) {
                        if (e.code === 'ER_BAD_FIELD_ERROR') columnsToAdd.push('ADD COLUMN pan_card VARCHAR(20)');
                    }
                    try {
                        await connection.execute(`SELECT aadhar_card FROM admission_form LIMIT 1`);
                    } catch (e) {
                        if (e.code === 'ER_BAD_FIELD_ERROR') columnsToAdd.push('ADD COLUMN aadhar_card VARCHAR(20)');
                    }
                    try {
                        await connection.execute(`SELECT photo FROM admission_form LIMIT 1`);
                    } catch (e) {
                        if (e.code === 'ER_BAD_FIELD_ERROR') columnsToAdd.push('ADD COLUMN photo LONGTEXT');
                    }
                    
                    if (columnsToAdd.length > 0) {
                        await connection.execute(`
                            ALTER TABLE admission_form 
                            ${columnsToAdd.join(', ')}
                        `);
                    }
                } catch (alterErr) {
                    console.log('pan_card/aadhar_card/photo columns may already exist or error:', alterErr.message);
                }
            }
        }
        
        // Ensure amount_paid column exists in donation_fee
        try {
            // Check if column exists by trying to select it
            await connection.execute(`SELECT amount_paid FROM donation_fee LIMIT 1`);
        } catch (err) {
            // Column doesn't exist, add it
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                try {
                    await connection.execute(`
                        ALTER TABLE donation_fee 
                        ADD COLUMN amount_paid DECIMAL(10, 2) DEFAULT 0.00
                    `);
                } catch (alterErr) {
                    // Ignore if column already exists or other error
                    console.log('amount_paid column may already exist or error:', alterErr.message);
                }
            }
        }
        
        // Ensure signatures table exists
        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS admission_signatures (
                    signature_id INT AUTO_INCREMENT PRIMARY KEY,
                    admission_id INT NOT NULL,
                    student_signature TEXT,
                    parent_signature TEXT,
                    teacher_signature TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_signatures_admission
                        FOREIGN KEY (admission_id)
                        REFERENCES admission_form(admission_id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE
                )
            `);
        } catch (err) {
            // Table might already exist, continue
        }
        
        // Insert into admission_form table (try with all columns first, fallback if columns don't exist)
        let admissionResult;
        try {
            // Try inserting with form_no, pan_card, aadhar_card, and photo
            [admissionResult] = await connection.execute(
                `INSERT INTO admission_form 
                (branch, admission_date, full_name, address, phone, date_of_birth, age, email_id, form_no, pan_card, aadhar_card, photo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.branch,
                    data.Admissiondate || new Date().toISOString().split('T')[0],
                    data.name,
                    data.address || null,
                    Array.isArray(data.phone) ? data.phone.join('') : data.phone || null,
                    data.dob || null,
                    age,
                    data.email || null,
                    formNo,
                    data.panCard || null,
                    data.aadharCard || null,
                    data.photo || null
                ]
            );
        } catch (insertErr) {
            // If columns don't exist, try with fewer columns
            if (insertErr.code === 'ER_BAD_FIELD_ERROR') {
                try {
                    // Try with form_no but without pan_card/aadhar_card
                    [admissionResult] = await connection.execute(
                        `INSERT INTO admission_form 
                        (branch, admission_date, full_name, address, phone, date_of_birth, age, email_id, form_no)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            data.branch,
                            data.Admissiondate || new Date().toISOString().split('T')[0],
                            data.name,
                            data.address || null,
                            Array.isArray(data.phone) ? data.phone.join('') : data.phone || null,
                            data.dob || null,
                            age,
                            data.email || null,
                            formNo
                        ]
                    );
                } catch (insertErr2) {
                    // If form_no also doesn't exist, insert without it
                    if (insertErr2.code === 'ER_BAD_FIELD_ERROR') {
                        [admissionResult] = await connection.execute(
                            `INSERT INTO admission_form 
                            (branch, admission_date, full_name, address, phone, date_of_birth, age, email_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                data.branch,
                                data.Admissiondate || new Date().toISOString().split('T')[0],
                                data.name,
                                data.address || null,
                                Array.isArray(data.phone) ? data.phone.join('') : data.phone || null,
                                data.dob || null,
                                age,
                                data.email || null
                            ]
                        );
                    } else {
                        throw insertErr2;
                    }
                }
            } else {
                throw insertErr; // Re-throw if it's a different error
            }
        }
        
        const admissionId = admissionResult.insertId;
        
        // Prepare music preferences data
        const instrumentalSelection = data.instruments && data.instruments.length > 0 
            ? data.instruments.join(', ') 
            : data.instrumentalSubject || null;
        
        const indianClassicalVocal = data.vocalSubject || null;
        const dance = data.mainStyles && data.mainStyles.length > 0 
            ? data.mainStyles.join(', ') 
            : data.danceSubject || null;
        
        const educationJobDetails = data.educationalActivities || data.education || null;
        
        // Ensure diploma_admission_year column exists in music_preferences
        try {
            await connection.execute(`SELECT diploma_admission_year FROM music_preferences LIMIT 1`);
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                try {
                    await connection.execute(`
                        ALTER TABLE music_preferences 
                        ADD COLUMN diploma_admission_year VARCHAR(50)
                    `);
                } catch (alterErr) {
                    console.log('diploma_admission_year column may already exist or error:', alterErr.message);
                }
            }
        }
        
        // Insert into music_preferences table
        try {
            await connection.execute(
                `INSERT INTO music_preferences 
                (admission_id, instrumental_selection, indian_classical_vocal, dance, education_job_details, joining_date, diploma_admission_year)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    admissionId,
                    instrumentalSelection,
                    indianClassicalVocal,
                    dance,
                    educationJobDetails,
                    data.joiningDate || null,
                    data.diplomaAdmissionYear || null
                ]
            );
        } catch (insertErr) {
            // If diploma_admission_year column doesn't exist, insert without it
            if (insertErr.code === 'ER_BAD_FIELD_ERROR') {
                await connection.execute(
                    `INSERT INTO music_preferences 
                    (admission_id, instrumental_selection, indian_classical_vocal, dance, education_job_details, joining_date)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        admissionId,
                        instrumentalSelection,
                        indianClassicalVocal,
                        dance,
                        educationJobDetails,
                        data.joiningDate || null
                    ]
                );
            } else {
                throw insertErr;
            }
        }
        
        // Get amount paid (default to 200 for admission fee, or use provided amount)
        const amountPaid = data.amountPaying ? parseFloat(data.amountPaying) : 200;
        
        // Generate DO No at payment creation (branch-wise, unique per payment)
        const doNo = await generateNextDoNo(data.branch, connection);
        
        // Insert into donation_fee table with do_no (try with do_no + amount_paid, fallbacks if columns missing)
        try {
            await connection.execute(
                `INSERT INTO donation_fee (admission_id, payment_type, transaction_id, amount_paid, do_no)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    admissionId,
                    paymentType,
                    data.transactionId,
                    amountPaid,
                    doNo
                ]
            );
        } catch (insertErr) {
            if (insertErr.code === 'ER_BAD_FIELD_ERROR') {
                try {
                    await connection.execute(
                        `INSERT INTO donation_fee (admission_id, payment_type, transaction_id, amount_paid)
                        VALUES (?, ?, ?, ?)`,
                        [admissionId, paymentType, data.transactionId, amountPaid]
                    );
                } catch (e2) {
                    if (e2.code === 'ER_BAD_FIELD_ERROR') {
                        await connection.execute(
                            `INSERT INTO donation_fee (admission_id, payment_type, transaction_id)
                            VALUES (?, ?, ?)`,
                            [admissionId, paymentType, data.transactionId]
                        );
                    } else {
                        throw e2;
                    }
                }
            } else {
                throw insertErr;
            }
        }
        
        // Insert signatures if provided
        if (data.signatures) {
            await connection.execute(
                `INSERT INTO admission_signatures 
                (admission_id, student_signature, parent_signature, teacher_signature)
                VALUES (?, ?, ?, ?)`,
                [
                    admissionId,
                    data.signatures.student || null,
                    data.signatures.parent || null,
                    data.signatures.teacher || null
                ]
            );
        }
        
        // ==========================================
        // Insert into branch-specific tables
        // ==========================================
        const branchTableName = getBranchTableName(data.branch);
        if (branchTableName) {
            try {
                // Ensure branch table exists
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS ${branchTableName} (
                        admission_id INT AUTO_INCREMENT PRIMARY KEY,
                        branch VARCHAR(100) NOT NULL,
                        admission_date DATE NOT NULL,
                        full_name VARCHAR(150) NOT NULL,
                        address TEXT,
                        phone VARCHAR(15),
                        date_of_birth DATE,
                        age INT,
                        email_id VARCHAR(150),
                        form_no VARCHAR(50),
                        pan_card VARCHAR(20),
                        aadhar_card VARCHAR(20),
                        photo LONGTEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_branch (branch),
                        INDEX idx_admission_date (admission_date),
                        INDEX idx_form_no (form_no)
                    )
                `);
                
                // Add pan_card, aadhar_card, and photo columns if they don't exist
                try {
                    await connection.execute(`SELECT pan_card, aadhar_card, photo FROM ${branchTableName} LIMIT 1`);
                } catch (err) {
                    if (err.code === 'ER_BAD_FIELD_ERROR') {
                        try {
                            // Check which columns are missing and add them
                            const columnsToAdd = [];
                            try {
                                await connection.execute(`SELECT pan_card FROM ${branchTableName} LIMIT 1`);
                            } catch (e) {
                                if (e.code === 'ER_BAD_FIELD_ERROR') columnsToAdd.push('ADD COLUMN pan_card VARCHAR(20)');
                            }
                            try {
                                await connection.execute(`SELECT aadhar_card FROM ${branchTableName} LIMIT 1`);
                            } catch (e) {
                                if (e.code === 'ER_BAD_FIELD_ERROR') columnsToAdd.push('ADD COLUMN aadhar_card VARCHAR(20)');
                            }
                            try {
                                await connection.execute(`SELECT photo FROM ${branchTableName} LIMIT 1`);
                            } catch (e) {
                                if (e.code === 'ER_BAD_FIELD_ERROR') columnsToAdd.push('ADD COLUMN photo LONGTEXT');
                            }
                            
                            if (columnsToAdd.length > 0) {
                                await connection.execute(`
                                    ALTER TABLE ${branchTableName} 
                                    ${columnsToAdd.join(', ')}
                                `);
                            }
                        } catch (alterErr) {
                            console.log(`pan_card/aadhar_card/photo columns may already exist in ${branchTableName} or error:`, alterErr.message);
                        }
                    }
                }
                
                // Insert into branch admission table
                let branchAdmissionResult;
                try {
                    // Try inserting with all columns including pan_card, aadhar_card, and photo
                    [branchAdmissionResult] = await connection.execute(
                        `INSERT INTO ${branchTableName} 
                        (branch, admission_date, full_name, address, phone, date_of_birth, age, email_id, form_no, pan_card, aadhar_card, photo)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            data.branch,
                            data.Admissiondate || new Date().toISOString().split('T')[0],
                            data.name,
                            data.address || null,
                            Array.isArray(data.phone) ? data.phone.join('') : data.phone || null,
                            data.dob || null,
                            age,
                            data.email || null,
                            formNo,
                            data.panCard || null,
                            data.aadharCard || null,
                            data.photo || null
                        ]
                    );
                } catch (insertErr) {
                    // If columns don't exist, try with fewer columns
                    if (insertErr.code === 'ER_BAD_FIELD_ERROR') {
                        try {
                            // Try with form_no but without pan_card/aadhar_card
                            [branchAdmissionResult] = await connection.execute(
                                `INSERT INTO ${branchTableName} 
                                (branch, admission_date, full_name, address, phone, date_of_birth, age, email_id, form_no)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    data.branch,
                                    data.Admissiondate || new Date().toISOString().split('T')[0],
                                    data.name,
                                    data.address || null,
                                    Array.isArray(data.phone) ? data.phone.join('') : data.phone || null,
                                    data.dob || null,
                                    age,
                                    data.email || null,
                                    formNo
                                ]
                            );
                        } catch (insertErr2) {
                            // If form_no also doesn't exist, insert without it
                            if (insertErr2.code === 'ER_BAD_FIELD_ERROR') {
                                [branchAdmissionResult] = await connection.execute(
                                    `INSERT INTO ${branchTableName} 
                                    (branch, admission_date, full_name, address, phone, date_of_birth, age, email_id)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [
                                        data.branch,
                                        data.Admissiondate || new Date().toISOString().split('T')[0],
                                        data.name,
                                        data.address || null,
                                        Array.isArray(data.phone) ? data.phone.join('') : data.phone || null,
                                        data.dob || null,
                                        age,
                                        data.email || null
                                    ]
                                );
                            } else {
                                throw insertErr2;
                            }
                        }
                    } else {
                        throw insertErr;
                    }
                }
                
                const branchAdmissionId = branchAdmissionResult.insertId;
                
                // Insert into branch music preferences table
                const branchMusicPrefsTable = getBranchMusicPrefsTable(data.branch);
                if (branchMusicPrefsTable) {
                    try {
                        await connection.execute(`
                            CREATE TABLE IF NOT EXISTS ${branchMusicPrefsTable} (
                                preference_id INT AUTO_INCREMENT PRIMARY KEY,
                                admission_id INT NOT NULL,
                                instrumental_selection VARCHAR(100),
                                indian_classical_vocal VARCHAR(100),
                                dance VARCHAR(100),
                                education_job_details TEXT,
                                joining_date DATE,
                                CONSTRAINT fk_${branchMusicPrefsTable}_admission
                                    FOREIGN KEY (admission_id)
                                    REFERENCES ${branchTableName}(admission_id)
                                    ON DELETE CASCADE
                                    ON UPDATE CASCADE
                            )
                        `);
                        
                        await connection.execute(
                            `INSERT INTO ${branchMusicPrefsTable} 
                            (admission_id, instrumental_selection, indian_classical_vocal, dance, education_job_details, joining_date)
                            VALUES (?, ?, ?, ?, ?, ?)`,
                            [
                                branchAdmissionId,
                                instrumentalSelection,
                                indianClassicalVocal,
                                dance,
                                educationJobDetails,
                                data.joiningDate || null
                            ]
                        );
                    } catch (err) {
                        console.log(`Warning: Could not insert into ${branchMusicPrefsTable}:`, err.message);
                    }
                }
                
                // Insert into branch donation fee table
                const branchDonationFeeTable = getBranchDonationFeeTable(data.branch);
                if (branchDonationFeeTable) {
                    try {
                        await connection.execute(`
                            CREATE TABLE IF NOT EXISTS ${branchDonationFeeTable} (
                                donation_id INT AUTO_INCREMENT PRIMARY KEY,
                                admission_id INT NOT NULL,
                                payment_type ENUM('One Time Full Donation', '3 Installments') NOT NULL,
                                transaction_id VARCHAR(100),
                                amount_paid DECIMAL(10, 2) DEFAULT 0.00,
                                CONSTRAINT fk_${branchDonationFeeTable}_admission
                                    FOREIGN KEY (admission_id)
                                    REFERENCES ${branchTableName}(admission_id)
                                    ON DELETE CASCADE
                                    ON UPDATE CASCADE
                            )
                        `);
                        
                        try {
                            await connection.execute(
                                `INSERT INTO ${branchDonationFeeTable} (admission_id, payment_type, transaction_id, amount_paid)
                                VALUES (?, ?, ?, ?)`,
                                [
                                    branchAdmissionId,
                                    paymentType,
                                    data.transactionId,
                                    amountPaid
                                ]
                            );
                        } catch (insertErr) {
                            // If amount_paid column doesn't exist, insert without it
                            if (insertErr.code === 'ER_BAD_FIELD_ERROR') {
                                await connection.execute(
                                    `INSERT INTO ${branchDonationFeeTable} (admission_id, payment_type, transaction_id)
                                    VALUES (?, ?, ?)`,
                                    [
                                        branchAdmissionId,
                                        paymentType,
                                        data.transactionId
                                    ]
                                );
                            } else {
                                throw insertErr;
                            }
                        }
                    } catch (err) {
                        console.log(`Warning: Could not insert into ${branchDonationFeeTable}:`, err.message);
                    }
                }
                
                // Insert into branch signatures table if provided
                if (data.signatures) {
                    const branchSignaturesTable = getBranchSignaturesTable(data.branch);
                    if (branchSignaturesTable) {
                        try {
                            await connection.execute(`
                                CREATE TABLE IF NOT EXISTS ${branchSignaturesTable} (
                                    signature_id INT AUTO_INCREMENT PRIMARY KEY,
                                    admission_id INT NOT NULL,
                                    student_signature TEXT,
                                    parent_signature TEXT,
                                    teacher_signature TEXT,
                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                    CONSTRAINT fk_${branchSignaturesTable}_admission
                                        FOREIGN KEY (admission_id)
                                        REFERENCES ${branchTableName}(admission_id)
                                        ON DELETE CASCADE
                                        ON UPDATE CASCADE
                                )
                            `);
                            
                            await connection.execute(
                                `INSERT INTO ${branchSignaturesTable} 
                                (admission_id, student_signature, parent_signature, teacher_signature)
                                VALUES (?, ?, ?, ?)`,
                                [
                                    branchAdmissionId,
                                    data.signatures.student || null,
                                    data.signatures.parent || null,
                                    data.signatures.teacher || null
                                ]
                            );
                        } catch (err) {
                            console.log(`Warning: Could not insert into ${branchSignaturesTable}:`, err.message);
                        }
                    }
                }
            } catch (branchErr) {
                // Log error but don't fail the main transaction
                console.error('Error inserting into branch table:', branchErr.message);
                // Continue with commit - main data is already saved
            }
        }
        
        // Create student_credentials table and store credentials with encrypted password
        try {
            // Ensure student_credentials table exists
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS student_credentials (
                    credential_id INT AUTO_INCREMENT PRIMARY KEY,
                    admission_id INT NOT NULL UNIQUE,
                    username VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_username (username),
                    INDEX idx_admission_id (admission_id),
                    CONSTRAINT fk_student_credentials_admission
                        FOREIGN KEY (admission_id)
                        REFERENCES admission_form(admission_id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE
                )
            `);
            
            // Get phone number (password)
            const phoneNumber = Array.isArray(data.phone) ? data.phone.join('') : data.phone || '';
            
            // Encrypt password (mobile number) using bcrypt
            const hashedPassword = await bcrypt.hash(phoneNumber, 10);
            
            // Ensure email column exists
            try {
                await connection.execute(`SELECT email FROM student_credentials LIMIT 1`);
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    await connection.execute(`ALTER TABLE student_credentials ADD COLUMN email VARCHAR(255) NULL`);
                    await connection.execute(`CREATE INDEX idx_email ON student_credentials(email)`);
                }
            }

            // Store credentials with email
            await connection.execute(
                `INSERT INTO student_credentials (admission_id, username, email, password)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 username = VALUES(username),
                 email = VALUES(email),
                 password = VALUES(password)`,
                [
                    admissionId,
                    data.name.trim(), // Full Name as username
                    data.email?.trim() || null, // Email
                    hashedPassword    // Encrypted mobile number as password
                ]
            );
        } catch (credErr) {
            // Log error but don't fail the transaction
            console.error('Error storing student credentials:', credErr.message);
            // Continue with commit - main data is already saved
        }
        
        await connection.commit();
        
        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${admissionId}`;
        
        res.status(201).json({
            success: true,
            id: admissionId,
            studentId: admissionId,
            formNo: formNo,
            invoiceNumber: invoiceNumber
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Registration Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Registration failed'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;

