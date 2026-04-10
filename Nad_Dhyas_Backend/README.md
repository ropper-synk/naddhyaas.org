# Swargumphan Backend API

Express.js backend server for the Swargumphan Music Department Management System with MySQL database.

## Features

- Student Registration API
- Donation Management API
- Form Number Generation
- Invoice Generation
- MySQL Database Integration

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- MySQL Database: `Music_dept` (created using the SQL script)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the Backend directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=Music_dept
DB_PORT=3306

PORT=3001
NODE_ENV=development

FRONTEND_URL=http://localhost:3000
```

3. Make sure your MySQL database is running and the `Music_dept` database exists with the required tables.

## Database Setup

The backend expects the following tables (created by the SQL script in `Music Database Record.txt`):

1. `admission_form` - Student admission information
2. `music_preferences` - Music course preferences
3. `donation_fee` - Payment and donation information
4. `form_counters` - Form number sequence counters (will be auto-created)
5. `donations` - Separate donations table (will be auto-created)

## Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:3001` (or the port specified in `.env`).

## API Endpoints

### 1. Register Student
**POST** `/api/register`

Register a new student admission.

**Request Body:**
```json
{
  "name": "Student Name",
  "branch": "Karamveer nagar satara",
  "Admissiondate": "2025-01-15",
  "address": "Address",
  "phone": ["9", "8", "7", "6", "5", "4", "3", "2", "1", "0"],
  "dob": "2000-01-01",
  "email": "student@example.com",
  "instruments": ["Guitar"],
  "vocalSubject": "Indian Classical",
  "mainStyles": ["Kathak"],
  "educationalActivities": "B.Tech Student",
  "joiningDate": "2025-01-20",
  "paymentMode": "full",
  "transactionId": "TXN123456"
}
```

**Response:**
```json
{
  "success": true,
  "id": 1,
  "studentId": 1,
  "formNo": "KR-00001",
  "invoiceNumber": "INV-1234567890-1"
}
```

### 2. Donate
**POST** `/api/donate`

Register a new donation.

**Request Body:**
```json
{
  "name": "Donor Name",
  "email": "donor@example.com",
  "phone": "9876543210",
  "address": "Address",
  "panCard": "ABCDE1234F",
  "adhaarCard": "123456789012",
  "amount": 5000,
  "transactionId": "TXN123456",
  "branch": "General",
  "paymentMode": "One Time"
}
```

**Response:**
```json
{
  "success": true,
  "id": 1,
  "invoiceNumber": "DON-1234567890"
}
```

### 3. Get Next Form Number
**GET** `/api/getNextFormNo?branch=Karamveer nagar satara`

Get the next form number for a branch (without incrementing).

**Response:**
```json
{
  "formNo": "KR-00001"
}
```

### 4. Get Invoice
**GET** `/api/invoice/:id`

Get invoice data for a student by admission ID.

**Response:**
```json
{
  "fullName": "Student Name",
  "invoiceNumber": "INV-1-123456",
  "createdAt": "2025-01-15",
  "branch": "Karamveer nagar satara",
  "musicType": "Guitar + Indian Classical + Kathak",
  "instruments": ["Guitar"],
  "vocalStyle": "Indian Classical",
  "danceStyles": ["Kathak"],
  "amountPaid": 10000,
  "transactionId": "TXN123456"
}
```

## Form Number Prefixes

- Karamveer nagar satara → `KR-`
- Godoli satara → `GS`
- Krantismurti satara → `KS`
- Karad → `K`
- Default → `FG-`

## Database Schema

The backend works with the following MySQL tables:

### admission_form
- admission_id (PK)
- branch
- admission_date
- full_name
- address
- phone
- date_of_birth
- age
- email_id

### music_preferences
- preference_id (PK)
- admission_id (FK)
- instrumental_selection
- indian_classical_vocal
- dance
- education_job_details
- joining_date

### donation_fee
- donation_id (PK)
- admission_id (FK)
- payment_type
- transaction_id

### form_counters (Auto-created)
- branch (PK)
- seq

### donations (Auto-created)
- donation_id (PK)
- full_name
- email
- phone
- address
- pan_card
- adhaar_card
- amount
- transaction_id
- invoice_number
- branch
- payment_mode
- donated_at

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Notes

- The backend automatically creates `form_counters` and `donations` tables if they don't exist
- Form numbers are generated based on branch with automatic sequence increment
- Invoice numbers are generated using timestamps and IDs
- All database operations use connection pooling for better performance

