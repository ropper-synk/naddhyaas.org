-- ==========================================
-- Branch-Specific Tables Migration
-- Creates 4 branch tables for data duplication
-- ==========================================

USE Music_dept;

-- ==========================================
-- Karmaveer Nagar Society Branch Tables
-- ==========================================

CREATE TABLE IF NOT EXISTS karmaveer_nagar_table (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_branch (branch),
    INDEX idx_admission_date (admission_date),
    INDEX idx_form_no (form_no)
);

CREATE TABLE IF NOT EXISTS karmaveer_nagar_music_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    instrumental_selection VARCHAR(100),
    indian_classical_vocal VARCHAR(100),
    dance VARCHAR(100),
    education_job_details TEXT,
    joining_date DATE,
    CONSTRAINT fk_karmaveer_music_admission
        FOREIGN KEY (admission_id)
        REFERENCES karmaveer_nagar_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS karmaveer_nagar_donation_fee (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    payment_type ENUM('One Time Full Donation', '3 Installments') NOT NULL,
    transaction_id VARCHAR(100),
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    CONSTRAINT fk_karmaveer_donation_admission
        FOREIGN KEY (admission_id)
        REFERENCES karmaveer_nagar_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS karmaveer_nagar_signatures (
    signature_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    student_signature TEXT,
    parent_signature TEXT,
    teacher_signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_karmaveer_signatures_admission
        FOREIGN KEY (admission_id)
        REFERENCES karmaveer_nagar_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ==========================================
-- Godoli, Satara Branch Tables
-- ==========================================

CREATE TABLE IF NOT EXISTS godoli_satara_table (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_branch (branch),
    INDEX idx_admission_date (admission_date),
    INDEX idx_form_no (form_no)
);

CREATE TABLE IF NOT EXISTS godoli_satara_music_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    instrumental_selection VARCHAR(100),
    indian_classical_vocal VARCHAR(100),
    dance VARCHAR(100),
    education_job_details TEXT,
    joining_date DATE,
    CONSTRAINT fk_godoli_music_admission
        FOREIGN KEY (admission_id)
        REFERENCES godoli_satara_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS godoli_satara_donation_fee (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    payment_type ENUM('One Time Full Donation', '3 Installments') NOT NULL,
    transaction_id VARCHAR(100),
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    CONSTRAINT fk_godoli_donation_admission
        FOREIGN KEY (admission_id)
        REFERENCES godoli_satara_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS godoli_satara_signatures (
    signature_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    student_signature TEXT,
    parent_signature TEXT,
    teacher_signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_godoli_signatures_admission
        FOREIGN KEY (admission_id)
        REFERENCES godoli_satara_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ==========================================
-- Krantismruti, Satara Branch Tables
-- ==========================================

CREATE TABLE IF NOT EXISTS krantismruti_satara_table (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_branch (branch),
    INDEX idx_admission_date (admission_date),
    INDEX idx_form_no (form_no)
);

CREATE TABLE IF NOT EXISTS krantismruti_satara_music_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    instrumental_selection VARCHAR(100),
    indian_classical_vocal VARCHAR(100),
    dance VARCHAR(100),
    education_job_details TEXT,
    joining_date DATE,
    CONSTRAINT fk_krantismruti_music_admission
        FOREIGN KEY (admission_id)
        REFERENCES krantismruti_satara_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS krantismruti_satara_donation_fee (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    payment_type ENUM('One Time Full Donation', '3 Installments') NOT NULL,
    transaction_id VARCHAR(100),
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    CONSTRAINT fk_krantismruti_donation_admission
        FOREIGN KEY (admission_id)
        REFERENCES krantismruti_satara_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS krantismruti_satara_signatures (
    signature_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    student_signature TEXT,
    parent_signature TEXT,
    teacher_signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_krantismruti_signatures_admission
        FOREIGN KEY (admission_id)
        REFERENCES krantismruti_satara_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ==========================================
-- Karad Branch Tables
-- ==========================================

CREATE TABLE IF NOT EXISTS karad_table (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_branch (branch),
    INDEX idx_admission_date (admission_date),
    INDEX idx_form_no (form_no)
);

CREATE TABLE IF NOT EXISTS karad_music_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    instrumental_selection VARCHAR(100),
    indian_classical_vocal VARCHAR(100),
    dance VARCHAR(100),
    education_job_details TEXT,
    joining_date DATE,
    CONSTRAINT fk_karad_music_admission
        FOREIGN KEY (admission_id)
        REFERENCES karad_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS karad_donation_fee (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    payment_type ENUM('One Time Full Donation', '3 Installments') NOT NULL,
    transaction_id VARCHAR(100),
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    CONSTRAINT fk_karad_donation_admission
        FOREIGN KEY (admission_id)
        REFERENCES karad_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS karad_signatures (
    signature_id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT NOT NULL,
    student_signature TEXT,
    parent_signature TEXT,
    teacher_signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_karad_signatures_admission
        FOREIGN KEY (admission_id)
        REFERENCES karad_table(admission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

