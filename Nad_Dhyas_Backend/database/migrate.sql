-- ==========================================
-- Migration Script: Add Missing Columns
-- Run this script to add new columns to existing tables
-- ==========================================

USE Music_dept;

-- Add form_no column to admission_form (if not exists)
-- Note: MySQL doesn't support IF NOT EXISTS for ALTER TABLE
-- Run this manually if the column doesn't exist
ALTER TABLE admission_form 
ADD COLUMN form_no VARCHAR(50) UNIQUE;

-- Add amount_paid column to donation_fee (if not exists)
ALTER TABLE donation_fee 
ADD COLUMN amount_paid DECIMAL(10, 2) DEFAULT 0.00;

-- Create signatures table (if not exists)
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admission_form_no ON admission_form(form_no);
CREATE INDEX IF NOT EXISTS idx_signatures_admission ON admission_signatures(admission_id);

