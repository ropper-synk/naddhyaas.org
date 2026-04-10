const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS with multiple origins
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'https://naddhyas.org',
    'http://naddhyas.org'
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(null, true); // Allow all origins for now (can restrict later)
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Log all incoming requests (for debugging)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
    if (req.method === 'POST' && req.path.includes('login')) {
        console.log('Login request body keys:', Object.keys(req.body || {}));
        console.log('Content-Type:', req.get('content-type'));
    }
    next();
});

// Serve static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/register', require('./routes/register'));
app.use('/api/donate', require('./routes/donate'));
app.use('/api/getNextFormNo', require('./routes/getNextFormNo'));
app.use('/api/invoice', require('./routes/invoice'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/student', require('./routes/student'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/letterhead', require('./routes/letterhead'));
app.use('/api/performance-slider', require('./routes/performanceSlider'));
app.use('/api/branch-manager', require('./routes/branchManager'));
app.use('/api/examination', require('./routes/examination'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Swargumphan Music Department Backend API',
        version: '1.0.0',
        endpoints: {
            register: 'POST /api/register',
            donate: 'POST /api/donate',
            getNextFormNo: 'GET /api/getNextFormNo?branch=...',
            invoice: 'GET /api/invoice/:id'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = app;

