'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Header from '../components/Header'
import styles from './Donation.module.css'

export default function DonationPage() {
    const [receiptNo, setReceiptNo] = useState('ND-001')
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [submittedReceiptNo, setSubmittedReceiptNo] = useState('')
    const [submittedDonationData, setSubmittedDonationData] = useState<any>(null)
    const [formData, setFormData] = useState({
        userUpiId: '',
        donatedBy: '',
        streetAddress: '',
        city: '',
        state: '',
        zip: '',
        dateOfDonation: '',
        donationValue: '',
        description: '',
        taxId: ''
    })

    // Fetch receipt number on component mount
    useEffect(() => {
        const fetchReceiptNo = async () => {
            try {
                const response = await fetch('/api/donation/receipt-no')
                if (response.ok) {
                    const data = await response.json()
                    setReceiptNo(data.receiptNo || 'ND-001')
                } else {
                    // Fallback to ND-001 if API fails
                    setReceiptNo('ND-001')
                }
            } catch (error) {
                console.error('Error fetching receipt number:', error)
                // Fallback to ND-001 if API fails
                setReceiptNo('ND-001')
            }
        }
        fetchReceiptNo()
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        try {
            // Submit donation to backend
            const response = await fetch('/api/donate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    receiptNo: receiptNo,
                    ...formData
                })
            })

            const result = await response.json()

            if (response.ok && result.success) {
                // Store submitted data for PDF generation
                const donationData = {
                    receiptNo: result.receiptNo || receiptNo,
                    ...formData
                }
                setSubmittedDonationData(donationData)
                setSubmittedReceiptNo(result.receiptNo || receiptNo)
                setIsSubmitted(true)
                // Reset form data
                setFormData({
                    userUpiId: '',
                    donatedBy: '',
                    streetAddress: '',
                    city: '',
                    state: '',
                    zip: '',
                    dateOfDonation: '',
                    donationValue: '',
                    description: '',
                    taxId: ''
                })
            } else {
                alert(`Donation submission failed: ${result.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Error submitting donation:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
                alert('Cannot connect to server. Please ensure the backend server is running on http://localhost:3001')
            } else {
                alert(`An error occurred while submitting the donation: ${errorMessage}. Please try again.`)
            }
        }
    }

    const downloadDonationPDF = () => {
        if (!submittedDonationData) return

        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        const donationDate = new Date(submittedDonationData.dateOfDonation).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Donation Receipt - ${submittedDonationData.receiptNo}</title>
                <style>
                    @media print {
                        @page { 
                            margin: 8mm;
                            size: A4;
                        }
                        body { 
                            margin: 0;
                            padding: 0;
                        }
                        .no-print { display: none; }
                        * {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        color: #000;
                        background: white;
                        font-size: 14px;
                        line-height: 1.6;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 2px solid #800000;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .header-left {
                        text-align: left;
                    }
                    .header-left h1 {
                        color: #800000;
                        margin: 0 0 8px 0;
                        font-size: 24px;
                        font-weight: bold;
                    }
                    .header-left p {
                        margin: 4px 0;
                        font-size: 14px;
                        color: #333;
                    }
                    .header-right {
                        text-align: right;
                    }
                    .header-right h2 {
                        color: #800000;
                        margin: 0 0 10px 0;
                        font-size: 24px;
                        font-weight: bold;
                    }
                    .header-right p {
                        margin: 5px 0;
                        font-size: 14px;
                        color: #333;
                    }
                    .info-section {
                        margin-bottom: 30px;
                    }
                    .info-section h3 {
                        color: #800000;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 8px;
                        margin-bottom: 15px;
                        font-size: 18px;
                        font-weight: bold;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 20px;
                    }
                    .info-item {
                        margin-bottom: 10px;
                    }
                    .info-item label {
                        font-weight: bold;
                        color: #333;
                        display: block;
                        margin-bottom: 4px;
                    }
                    .info-item span {
                        color: #555;
                    }
                    .donation-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 30px 0;
                    }
                    .donation-table thead {
                        background: #800000;
                        color: white;
                    }
                    .donation-table th {
                        padding: 12px;
                        text-align: left;
                        font-weight: 600;
                    }
                    .donation-table td {
                        padding: 12px;
                        border-bottom: 1px solid #ddd;
                    }
                    .donation-table tfoot td {
                        font-weight: bold;
                        font-size: 18px;
                        padding: 15px 12px;
                        background: #f9f9f9;
                    }
                    .amount-cell {
                        text-align: right;
                        color: #800000;
                        font-weight: bold;
                        font-size: 18px;
                    }
                    .footer {
                        margin-top: 50px;
                        text-align: center;
                        color: #777;
                        font-size: 12px;
                        border-top: 1px solid #ddd;
                        padding-top: 20px;
                    }
                    .footer p {
                        margin: 5px 0;
                    }
                    .no-print {
                        text-align: center;
                        margin-top: 30px;
                    }
                    .no-print button {
                        padding: 12px 24px;
                        background: #800000;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        margin: 0 10px;
                    }
                    .no-print button:hover {
                        background: #990000;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-left">
                        <h1>Naad Dhyas Foundation</h1>
                        <p>At post Deravan</p>
                        <p>Tal : Patan , Dist : Satara</p>
                    </div>
                    <div class="header-right">
                        <h2>Donation Receipt</h2>
                        <p><strong>Receipt No:</strong> ${submittedDonationData.receiptNo}</p>
                        <p><strong>Date:</strong> ${donationDate}</p>
                    </div>
                </div>

                <div class="info-section">
                    <h3>Donor Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Donated By:</label>
                            <span>${submittedDonationData.donatedBy}</span>
                        </div>
                        <div class="info-item">
                            <label>User UPI ID:</label>
                            <span>${submittedDonationData.userUpiId}</span>
                        </div>
                        <div class="info-item">
                            <label>Street Address:</label>
                            <span>${submittedDonationData.streetAddress}</span>
                        </div>
                        <div class="info-item">
                            <label>City:</label>
                            <span>${submittedDonationData.city}</span>
                        </div>
                        <div class="info-item">
                            <label>State:</label>
                            <span>${submittedDonationData.state}</span>
                        </div>
                        <div class="info-item">
                            <label>Zip Code:</label>
                            <span>${submittedDonationData.zip}</span>
                        </div>
                    </div>
                </div>

                <table class="donation-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <div><strong>Donation</strong></div>
                                <div style="font-size: 13px; color: #666; margin-top: 5px;">
                                    ${submittedDonationData.description}
                                </div>
                            </td>
                            <td class="amount-cell">₹${parseFloat(submittedDonationData.donationValue).toLocaleString('en-IN')}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style="text-align: right;"><strong>Total Donation:</strong></td>
                            <td class="amount-cell">₹${parseFloat(submittedDonationData.donationValue).toLocaleString('en-IN')}</td>
                        </tr>
                    </tfoot>
                </table>

                <div class="footer">
                    <p>Thank you for your generous donation to Naad Dhyas Foundation.</p>
                    <p>This is a computer generated receipt and does not require a signature.</p>
                </div>

                <div class="no-print">
                    <button onclick="window.print()">Print / Download PDF</button>
                    <button onclick="window.close()">Close</button>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 250);
                    };
                </script>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    // If donation is successfully submitted, show success page
    if (isSubmitted) {
        return (
            <main className={styles.main}>
                <Header />
                <div className={styles.container}>
                    <div className={styles.successCard}>
                        <div className={styles.successIcon}>✓</div>
                        <h1 className={styles.successTitle}>Donation Successful!</h1>
                        <p className={styles.successMessage}>
                            Thank you for your generous donation to Naad Dhyas Foundation.
                        </p>
                        <div className={styles.receiptInfo}>
                            <p className={styles.receiptLabel}>Receipt Number:</p>
                            <p className={styles.receiptValue}>{submittedReceiptNo}</p>
                        </div>
                        <p className={styles.successNote}>
                            Your donation has been recorded successfully. A receipt has been generated for your records.
                        </p>
                        <div className={styles.successActions}>
                            <button 
                                onClick={downloadDonationPDF}
                                className={styles.downloadButton}
                            >
                                📄 Download Receipt
                            </button>
                            <button 
                                onClick={() => {
                                    setIsSubmitted(false)
                                    // Fetch new receipt number for next donation
                                    fetch('/api/donation/receipt-no')
                                        .then(res => res.json())
                                        .then(data => setReceiptNo(data.receiptNo || 'ND-001'))
                                        .catch(() => setReceiptNo('ND-001'))
                                }}
                                className={styles.backButton}
                            >
                                Back to Donation
                            </button>
                            <Link 
                                href="/"
                                className={styles.homeButton}
                            >
                                Visit Home Page
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className={styles.main}>
            <Header />
            <div className={styles.container}>
                <div className={styles.formCard}>
                    {/* Header Section */}
                    <div className={styles.header}>
                        <div className={styles.headerLeft}>
                            <h1 className={styles.title}>Naad Dhyas Foundation</h1>
                            <p className={styles.address}>At post Deravan</p>
                            <p className={styles.address}>Tal : Patan , Dist : Satara</p>
                        </div>
                        <div className={styles.headerRight}>
                            <h2 className={styles.receiptTitle}>Donation Receipt</h2>
                        </div>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>Donor Information</h3>
                            
                            {/* UPI Payment Image */}
                            <div className={styles.upiContainer}>
                                <Image
                                    src="/UPI.png"
                                    alt="UPI Payment QR Code"
                                    width={250}
                                    height={250}
                                    className={styles.upiImage}
                                    priority
                                />
                                <div className={styles.upiIdContainer}>
                                    <p className={styles.upiIdLabel}>UPI ID:</p>
                                    <p className={styles.upiId}>krdmr011246011@yesbank</p>
                                </div>
                                <p className={styles.upiText}>Scan to make payment via UPI</p>
                            </div>
                            
                            <div className={styles.formGroup}>
                                <label className={styles.label}>User UPI ID: *</label>
                                <input
                                    type="text"
                                    name="userUpiId"
                                    value={formData.userUpiId}
                                    onChange={handleChange}
                                    className={styles.input}
                                    required
                                    placeholder="Enter your UPI ID (e.g., yourname@paytm)"
                                />
                            </div>
                            
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Donated By: *</label>
                                <input
                                    type="text"
                                    name="donatedBy"
                                    value={formData.donatedBy}
                                    onChange={handleChange}
                                    className={styles.input}
                                    required
                                    placeholder="Enter donor name"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Street Address: *</label>
                                <input
                                    type="text"
                                    name="streetAddress"
                                    value={formData.streetAddress}
                                    onChange={handleChange}
                                    className={styles.input}
                                    required
                                    placeholder="Enter street address"
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>City: *</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className={styles.input}
                                        required
                                        placeholder="Enter city"
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>State: *</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        className={styles.input}
                                        required
                                        placeholder="Enter state"
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Zip: *</label>
                                    <input
                                        type="text"
                                        name="zip"
                                        value={formData.zip}
                                        onChange={handleChange}
                                        className={styles.input}
                                        required
                                        placeholder="Enter zip code"
                                        pattern="[0-9]{6}"
                                        maxLength={6}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Date of Donation: *</label>
                                <input
                                    type="date"
                                    name="dateOfDonation"
                                    value={formData.dateOfDonation}
                                    onChange={handleChange}
                                    className={styles.input}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Donation Value: *</label>
                                <input
                                    type="number"
                                    name="donationValue"
                                    value={formData.donationValue}
                                    onChange={handleChange}
                                    className={styles.input}
                                    required
                                    placeholder="Enter donation amount (₹)"
                                    min="1"
                                    step="0.01"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Description of Donation: *</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className={styles.textarea}
                                    required
                                    placeholder="Enter description of donation"
                                    rows={4}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Tax ID Field:</label>
                                <input
                                    type="text"
                                    name="taxId"
                                    value={formData.taxId}
                                    onChange={handleChange}
                                    className={styles.input}
                                    disabled
                                    placeholder="Tax ID (will be enabled later)"
                                />
                                <p className={styles.helpText}>This field is currently disabled and will be enabled later</p>
                            </div>
                        </div>

                        <div className={styles.formActions}>
                            <button type="submit" className={styles.submitButton}>
                                Submit Donation
                            </button>
                            <button type="button" className={styles.resetButton} onClick={() => {
                                setFormData({
                                    userUpiId: '',
                                    donatedBy: '',
                                    streetAddress: '',
                                    city: '',
                                    state: '',
                                    zip: '',
                                    dateOfDonation: '',
                                    donationValue: '',
                                    description: '',
                                    taxId: ''
                                })
                            }}>
                                Reset Form
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    )
}
