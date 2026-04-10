-- DO No: branch-wise auto-generated number for payment receipts
-- Run this once to add do_no support.

-- Sequence table: one counter per branch (same branch values as admission_form.branch)
CREATE TABLE IF NOT EXISTS do_no_sequence (
    branch VARCHAR(100) PRIMARY KEY,
    seq INT DEFAULT 0 NOT NULL
);

-- Add do_no column only if it does not exist (safe to run multiple times)
SET @dbname = DATABASE();
SET @tablename = 'donation_fee';
SET @columnname = 'do_no';
SET @prepared = (SELECT COUNT(*) = 0 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname);
SET @sql = IF(@prepared,
  'ALTER TABLE donation_fee ADD COLUMN do_no VARCHAR(20) NULL UNIQUE',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add another column only if it does not exist (edit name/type as needed)
SET @columnname = 'remarks';
SET @prepared = (SELECT COUNT(*) = 0 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname);
SET @sql = IF(@prepared,
  'ALTER TABLE donation_fee ADD COLUMN remarks VARCHAR(255) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
