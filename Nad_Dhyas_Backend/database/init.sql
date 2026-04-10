-- ==========================================
-- Additional Tables for Backend
-- ==========================================

-- Form Counters Table (for form number generation)
CREATE TABLE IF NOT EXISTS form_counters (
    branch VARCHAR(100) PRIMARY KEY,
    seq INT DEFAULT 0 NOT NULL
);

-- Add missing columns to existing tables
-- Note: These ALTER TABLE statements will fail if columns already exist
-- The backend code will handle this gracefully by checking for column existence first
-- 
-- To manually add these columns, run:
-- ALTER TABLE admission_form ADD COLUMN form_no VARCHAR(50) UNIQUE;
-- ALTER TABLE donation_fee ADD COLUMN amount_paid DECIMAL(10, 2) DEFAULT 0.00;

-- Create signatures table for storing student, parent, and teacher signatures
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
);

-- Donations Table (for separate donations not linked to admissions)
CREATE TABLE IF NOT EXISTS donations (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(15),
    address TEXT,
    pan_card VARCHAR(20) NOT NULL,
    adhaar_card VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    branch VARCHAR(100) DEFAULT 'General',
    payment_mode VARCHAR(50) DEFAULT 'One Time',
    donated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_donations_transaction ON donations(transaction_id);
CREATE INDEX idx_donations_invoice ON donations(invoice_number);
CREATE INDEX idx_admission_branch ON admission_form(branch);
CREATE INDEX idx_admission_date ON admission_form(admission_date);

-- ==========================================
-- Branch-Specific Tables
-- ==========================================
-- Branch tables are created automatically by the registration route
-- when data is submitted. For manual creation, run:
-- Backend/database/create_branch_tables.sql
--
-- Branch tables created:
-- - karmaveer_nagar_table (for Karmaveer Nagar Society)
-- - godoli_satara_table (for Godoli, Satara)
-- - krantismruti_satara_table (for Krantismruti, Satara)
-- - karad_table (for Karad)
--
-- Each branch also has related tables:
-- - {branch}_music_preferences
-- - {branch}_donation_fee
-- - {branch}_signatures

-- ==========================================
-- Root Admin Table
-- ==========================================
-- Root admin table is created automatically by the admin login route
-- For manual creation, run:
-- Backend/database/create_root_admin.sql
--
-- Default credentials:
-- Username: root
-- Password: root (stored as bcrypt hash)
--
-- To initialize root admin, run:
-- node Backend/scripts/initRootAdmin.js

