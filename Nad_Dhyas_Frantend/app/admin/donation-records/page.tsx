'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '../dashboard/AdminLayout'
import styles from './DonationRecords.module.css'

interface DonationRecord {
    donation_id: number
    receipt_no: string
    user_upi_id: string
    donated_by: string
    street_address: string
    city: string
    state: string
    zip: string
    date_of_donation: string
    donation_value: number
    description: string
    tax_id: string | null
    created_at: string
}

interface DonationStats {
    totalDonations: number
    totalAmount: number
    averageDonation: number
    donationsThisMonth: number
    monthlyAmount: number
    donationsByMonth: Array<{ 
        month: string
        monthKey?: string
        year?: number
        monthNum?: number
        count: number
        amount: number 
    }>
    topDonors: Array<{ name: string; total: number; count: number }>
}

export default function DonationRecordsPage() {
    const router = useRouter()
    const [donations, setDonations] = useState<DonationRecord[]>([])
    const [stats, setStats] = useState<DonationStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterDate, setFilterDate] = useState('')
    const [selectedMonth, setSelectedMonth] = useState<string>('all')
    const [selectedYear, setSelectedYear] = useState<string>('all')
    const [receiptNoSort, setReceiptNoSort] = useState<'asc' | 'desc' | 'none'>('none')
    const [editingDonation, setEditingDonation] = useState<DonationRecord | null>(null)
    const [editFormData, setEditFormData] = useState({
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

    useEffect(() => {
        // Check authentication
        const adminRole = localStorage.getItem('adminRole')
        const isRootAdmin = localStorage.getItem('isRootAdmin')
        
        if (adminRole !== 'ROOT' && isRootAdmin !== 'true') {
            router.push('/admin/login')
            return
        }

        fetchDonations()
    }, [router])

    const fetchDonations = async () => {
        try {
            setLoading(true)
            console.log('Fetching donation records...')
            const res = await fetch('/api/admin/donation-records', {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            })
            
            console.log('Response status:', res.status)
            const data = await res.json()
            console.log('Donation records data:', data)

            if (data.success) {
                console.log(`Received ${data.donations?.length || 0} donations`)
                console.log('Sample donation:', data.donations?.[0])
                console.log('Stats:', data.stats)
                setDonations(data.donations || [])
                setStats(data.stats || null)
            } else {
                console.error('Failed to fetch donations:', data.error)
                console.error('Full response:', data)
                alert(`Failed to fetch donations: ${data.error || 'Unknown error'}`)
                setDonations([])
                setStats(null)
            }
        } catch (error) {
            console.error('Error fetching donations:', error)
            alert(`Error fetching donations: ${error instanceof Error ? error.message : 'Unknown error'}`)
            setDonations([])
            setStats(null)
        } finally {
            setLoading(false)
        }
    }

    const filteredDonations = (() => {
        let list = [...donations]

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter(
                (d) =>
                    d.donated_by?.toLowerCase().includes(q) ||
                    d.receipt_no?.toLowerCase().includes(q) ||
                    d.user_upi_id?.toLowerCase().includes(q) ||
                    d.description?.toLowerCase().includes(q)
            )
        }

        // Single date filter (legacy)
        if (filterDate) {
            list = list.filter((d) => d.date_of_donation === filterDate)
        }

        // Month filter
        if (selectedMonth !== 'all') {
            list = list.filter((d) => {
                if (!d.date_of_donation) return false
                const date = new Date(d.date_of_donation)
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                return month === selectedMonth || (date.getMonth() + 1).toString() === selectedMonth
            })
        }

        // Year filter
        if (selectedYear !== 'all') {
            list = list.filter((d) => {
                if (!d.date_of_donation) return false
                const date = new Date(d.date_of_donation)
                return date.getFullYear().toString() === selectedYear
            })
        }

        // Receipt No sort
        if (receiptNoSort !== 'none') {
            list = [...list].sort((a, b) => {
                const valA = a.receipt_no || ''
                const valB = b.receipt_no || ''
                if (receiptNoSort === 'asc') {
                    return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
                }
                return valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' })
            })
        }

        return list
    })()

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const downloadDonationPDF = (donation: DonationRecord) => {
        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        const donationDate = new Date(donation.date_of_donation).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Donation Receipt - ${donation.receipt_no}</title>
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
                        <p><strong>Receipt No:</strong> ${donation.receipt_no}</p>
                        <p><strong>Date:</strong> ${donationDate}</p>
                    </div>
                </div>

                <div class="info-section">
                    <h3>Donor Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Donated By:</label>
                            <span>${donation.donated_by || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <label>User UPI ID:</label>
                            <span>${donation.user_upi_id || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <label>Street Address:</label>
                            <span>${donation.street_address || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <label>City:</label>
                            <span>${donation.city || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <label>State:</label>
                            <span>${donation.state || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <label>Zip Code:</label>
                            <span>${donation.zip || 'N/A'}</span>
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
                                    ${donation.description || 'N/A'}
                                </div>
                            </td>
                            <td class="amount-cell">₹${(donation.donation_value || 0).toLocaleString('en-IN')}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style="text-align: right;"><strong>Total Donation:</strong></td>
                            <td class="amount-cell">₹${(donation.donation_value || 0).toLocaleString('en-IN')}</td>
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

    const handleDelete = async (donationId: number, receiptNo: string) => {
        if (!confirm(`Are you sure you want to delete donation record ${receiptNo}? This action cannot be undone.`)) {
            return
        }

        try {
            const res = await fetch(`/api/admin/donation-records/${donationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const data = await res.json()

            if (res.ok && data.success) {
                alert('Donation record deleted successfully')
                // Refresh the donations list
                fetchDonations()
            } else {
                alert(`Failed to delete donation record: ${data.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Error deleting donation record:', error)
            alert(`Error deleting donation record: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const handleEdit = (donation: DonationRecord) => {
        setEditingDonation(donation)
        setEditFormData({
            userUpiId: donation.user_upi_id || '',
            donatedBy: donation.donated_by || '',
            streetAddress: donation.street_address || '',
            city: donation.city || '',
            state: donation.state || '',
            zip: donation.zip || '',
            dateOfDonation: donation.date_of_donation || '',
            donationValue: donation.donation_value?.toString() || '',
            description: donation.description || '',
            taxId: donation.tax_id || ''
        })
    }

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingDonation) return

        try {
            const res = await fetch(`/api/admin/donation-records/${editingDonation.donation_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editFormData)
            })

            const data = await res.json()

            if (res.ok && data.success) {
                alert('Donation record updated successfully')
                setEditingDonation(null)
                fetchDonations()
            } else {
                alert(`Failed to update donation record: ${data.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Error updating donation record:', error)
            alert(`Error updating donation record: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    return (
        <AdminLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Donation Records</h1>
                    <button onClick={fetchDonations} className={styles.refreshBtn}>
                        Refresh
                    </button>
                </div>

                {/* Statistics Cards */}
                {stats && (
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>💰</div>
                            <div className={styles.statContent}>
                                <h3 className={styles.statLabel}>Total Donations</h3>
                                <p className={styles.statValue}>{stats.totalDonations || 0}</p>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>💵</div>
                            <div className={styles.statContent}>
                                <h3 className={styles.statLabel}>Total Amount</h3>
                                <p className={styles.statValue}>{formatCurrency(stats.totalAmount || 0)}</p>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>📊</div>
                            <div className={styles.statContent}>
                                <h3 className={styles.statLabel}>Average Donation</h3>
                                <p className={styles.statValue}>{formatCurrency(stats.averageDonation || 0)}</p>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>📅</div>
                            <div className={styles.statContent}>
                                <h3 className={styles.statLabel}>This Month</h3>
                                <p className={styles.statValue}>{stats.donationsThisMonth || 0} ({formatCurrency(stats.monthlyAmount || 0)})</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters - aligned, structured layout */}
                <div className={styles.filtersRow}>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                            Sort Receipt No
                        </label>
                        <select
                            value={receiptNoSort}
                            onChange={(e) => setReceiptNoSort(e.target.value as 'asc' | 'desc' | 'none')}
                            className={styles.searchInput}
                            style={{ width: '100%', padding: '10px 14px' }}
                        >
                            <option value="none">No Sort</option>
                            <option value="asc">Ascending (A-Z, 1-9)</option>
                            <option value="desc">Descending (Z-A, 9-1)</option>
                        </select>
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                            Filter by Month
                        </label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className={styles.searchInput}
                            style={{ width: '100%', padding: '10px 14px' }}
                        >
                            <option value="all">All Months</option>
                            <option value="01">January</option>
                            <option value="02">February</option>
                            <option value="03">March</option>
                            <option value="04">April</option>
                            <option value="05">May</option>
                            <option value="06">June</option>
                            <option value="07">July</option>
                            <option value="08">August</option>
                            <option value="09">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                        </select>
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                            Filter by Year
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className={styles.searchInput}
                            style={{ width: '100%', padding: '10px 14px' }}
                        >
                            <option value="all">All Years</option>
                            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                                <option key={y} value={y.toString()}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                            Search
                        </label>
                        <input
                            type="text"
                            placeholder="Search by donor name, receipt no, UPI ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                            style={{ width: '100%', padding: '10px 14px' }}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>
                            Specific Date
                        </label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className={styles.dateInput}
                            style={{ width: '100%', padding: '10px 14px' }}
                        />
                    </div>
                </div>
                <div className={styles.filtersActions}>
                        {(selectedMonth !== 'all' || selectedYear !== 'all' || searchQuery || filterDate || receiptNoSort !== 'none') && (
                            <button
                                onClick={() => {
                                    setSelectedMonth('all')
                                    setSelectedYear('all')
                                    setSearchQuery('')
                                    setFilterDate('')
                                    setReceiptNoSort('none')
                                }}
                                className={styles.clearFilterBtn}
                            >
                                Clear All Filters
                            </button>
                        )}
                        {filteredDonations.length > 0 && (
                            <button
                                onClick={() => {
                                    const printWindow = window.open('', '_blank')
                                    if (!printWindow) return
                                    const monthNames: Record<string, string> = {
                                        '01': 'January', '02': 'February', '03': 'March', '04': 'April',
                                        '05': 'May', '06': 'June', '07': 'July', '08': 'August',
                                        '09': 'September', '10': 'October', '11': 'November', '12': 'December'
                                    }
                                    let filterInfo = `Total Records: ${filteredDonations.length}`
                                    if (selectedMonth !== 'all') filterInfo += ` | Month: ${monthNames[selectedMonth] || selectedMonth}`
                                    if (selectedYear !== 'all') filterInfo += ` | Year: ${selectedYear}`
                                    if (receiptNoSort !== 'none') filterInfo += ` | Receipt No: ${receiptNoSort === 'asc' ? 'Ascending' : 'Descending'}`
                                    printWindow.document.write(`<!DOCTYPE html><html><head><title>Donation Records Report</title><style>@media print{@page{margin:10mm;size:A4 landscape}body{margin:0}.no-print{display:none}}body{font-family:Arial;padding:10px;font-size:10px}h1{color:#800000;text-align:center}h2{text-align:center;font-size:14px}.filter-info{text-align:center;margin:10px 0;font-size:9px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#800000;color:white;padding:8px;text-align:left}td{padding:6px;border:1px solid #ddd}tr:nth-child(even){background:#f5f5f5}.amount{text-align:right;font-weight:bold}.no-print button{padding:10px 20px;background:#800000;color:white;border:none;border-radius:5px;cursor:pointer;margin:0 10px}</style></head><body><h1>Naad Dhyas Foundation</h1><h2>Donation Records Report</h2><div class="filter-info">${filterInfo}</div><table><thead><tr><th>Receipt No</th><th>Donated By</th><th>UPI ID</th><th>Date</th><th>Amount</th><th>Description</th></tr></thead><tbody>${filteredDonations.map((d) => `<tr><td>${d.receipt_no || '-'}</td><td>${d.donated_by || '-'}</td><td>${d.user_upi_id || '-'}</td><td>${d.date_of_donation ? new Date(d.date_of_donation).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td><td class="amount">₹${(d.donation_value || 0).toLocaleString('en-IN')}</td><td>${(d.description || '-').substring(0, 50)}</td></tr>`).join('')}</tbody></table><div class="filter-info">Generated on ${new Date().toLocaleString('en-IN')}</div><div class="no-print"><button onclick="window.print()">🖨️ Print / Save as PDF</button><button onclick="window.close()">Close</button></div></body></html>`)
                                    printWindow.document.close()
                                }}
                                style={{
                                    padding: '10px 20px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                📄 Download PDF ({filteredDonations.length})
                            </button>
                        )}
                    </div>

                {/* Donations Table */}
                {loading ? (
                    <div className={styles.loading}>Loading donation records...</div>
                ) : donations.length === 0 ? (
                    <div className={styles.noData}>
                        <p>No donation records found in the database.</p>
                        <p style={{ marginTop: '10px', fontSize: '14px', color: '#9ca3af' }}>
                            Donations will appear here once they are submitted through the donation form.
                        </p>
                    </div>
                ) : filteredDonations.length === 0 ? (
                    <div className={styles.noData}>
                        No donation records match your search criteria.
                        <button 
                            onClick={() => {
                                setSearchQuery('')
                                setFilterDate('')
                                setSelectedMonth('all')
                                setSelectedYear('all')
                                setReceiptNoSort('none')
                            }}
                            className={styles.clearFilterBtn}
                            style={{ marginLeft: '10px' }}
                        >
                            Clear All Filters
                        </button>
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Receipt No</th>
                                    <th>Donated By</th>
                                    <th>UPI ID</th>
                                    <th>Address</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Description</th>
                                    <th>Created At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDonations.map((donation) => (
                                    <tr key={donation.donation_id}>
                                        <td className={styles.receiptNo}>{donation.receipt_no || 'N/A'}</td>
                                        <td className={styles.donorName}>{donation.donated_by || 'N/A'}</td>
                                        <td className={styles.upiId}>{donation.user_upi_id || 'N/A'}</td>
                                        <td className={styles.address}>
                                            {donation.street_address || ''}, {donation.city || ''}, {donation.state || ''} - {donation.zip || ''}
                                        </td>
                                        <td>{donation.date_of_donation ? formatDate(donation.date_of_donation) : 'N/A'}</td>
                                        <td className={styles.amount}>{formatCurrency(donation.donation_value || 0)}</td>
                                        <td className={styles.description} title={donation.description || ''}>
                                            {donation.description && donation.description.length > 50 
                                                ? `${donation.description.substring(0, 50)}...` 
                                                : (donation.description || 'N/A')}
                                        </td>
                                        <td>{donation.created_at ? formatDate(donation.created_at) : 'N/A'}</td>
                                        <td>
                                            <div className={styles.actionButtons}>
                                                <button
                                                    onClick={() => downloadDonationPDF(donation)}
                                                    className={styles.pdfButton}
                                                    title="Download PDF receipt"
                                                >
                                                    Read
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(donation)}
                                                    className={styles.editButton}
                                                    title="Edit donation record"
                                                >
                                                     Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(donation.donation_id, donation.receipt_no)}
                                                    className={styles.deleteButton}
                                                    title="Delete donation record"
                                                >
                                                     Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Monthly Chart */}
                {stats && stats.donationsByMonth.length > 0 && (() => {
                    // Calculate max and min amounts for proper scaling and color coding
                    const amounts = stats.donationsByMonth.map(item => item.amount)
                    const maxAmount = Math.max(...amounts, 0)
                    const minAmount = Math.min(...amounts.filter(amt => amt > 0), maxAmount) // Exclude 0, but if all are 0, use maxAmount
                    return (
                        <div className={styles.chartSection}>
                            <h2 className={styles.chartTitle}>Monthly Donations</h2>
                            <div className={styles.chartContainer}>
                                <div className={styles.barChart}>
                                    {stats.donationsByMonth.map((item) => {
                                        const barHeight = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0
                                        const isHighest = item.amount === maxAmount && maxAmount > 0
                                        const isLowest = item.amount === minAmount && minAmount < maxAmount && item.amount > 0
                                        const isMid = !isHighest && !isLowest && item.amount > 0
                                        
                                        let barClass = styles.bar
                                        if (isHighest) barClass += ` ${styles.barHighest}`
                                        else if (isLowest) barClass += ` ${styles.barLowest}`
                                        else if (isMid) barClass += ` ${styles.barMid}`
                                        
                                        return (
                                            <div key={item.monthKey || item.month} className={styles.barItem}>
                                                <div className={styles.barWrapper}>
                                                    <div 
                                                        className={barClass}
                                                        style={{ 
                                                            height: `${barHeight}%`,
                                                            minHeight: barHeight > 0 ? '20px' : '0px'
                                                        }}
                                                    >
                                                        <span className={styles.barAmount}>{formatCurrency(item.amount)}</span>
                                                    </div>
                                                </div>
                                                <div className={styles.barLabel}>{item.month}</div>
                                                <div className={styles.barCount}>{item.count} donation{item.count !== 1 ? 's' : ''}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )
                })()}

                {/* Top Donors */}
                {stats && stats.topDonors.length > 0 && (
                    <div className={styles.topDonorsSection}>
                        <h2 className={styles.chartTitle}>Top Donors</h2>
                        <div className={styles.topDonorsList}>
                            {stats.topDonors.map((donor, index) => (
                                <div key={index} className={styles.donorCard}>
                                    <div className={styles.donorRank}>#{index + 1}</div>
                                    <div className={styles.donorInfo}>
                                        <h3 className={styles.donorName}>{donor.name}</h3>
                                        <p className={styles.donorStats}>
                                            {donor.count} donation{donor.count > 1 ? 's' : ''} • {formatCurrency(donor.total)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingDonation && (
                <div className={styles.modalOverlay} onClick={() => setEditingDonation(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Edit Donation Record</h2>
                            <button 
                                className={styles.modalCloseButton}
                                onClick={() => setEditingDonation(null)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className={styles.editForm}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Receipt No:</label>
                                <input
                                    type="text"
                                    value={editingDonation.receipt_no}
                                    className={styles.input}
                                    disabled
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>User UPI ID: *</label>
                                <input
                                    type="text"
                                    name="userUpiId"
                                    value={editFormData.userUpiId}
                                    onChange={handleEditChange}
                                    className={styles.input}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Donated By: *</label>
                                <input
                                    type="text"
                                    name="donatedBy"
                                    value={editFormData.donatedBy}
                                    onChange={handleEditChange}
                                    className={styles.input}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Street Address: *</label>
                                <input
                                    type="text"
                                    name="streetAddress"
                                    value={editFormData.streetAddress}
                                    onChange={handleEditChange}
                                    className={styles.input}
                                    required
                                />
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>City: *</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={editFormData.city}
                                        onChange={handleEditChange}
                                        className={styles.input}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>State: *</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={editFormData.state}
                                        onChange={handleEditChange}
                                        className={styles.input}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Zip: *</label>
                                    <input
                                        type="text"
                                        name="zip"
                                        value={editFormData.zip}
                                        onChange={handleEditChange}
                                        className={styles.input}
                                        required
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
                                    value={editFormData.dateOfDonation}
                                    onChange={handleEditChange}
                                    className={styles.input}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Donation Value: *</label>
                                <input
                                    type="number"
                                    name="donationValue"
                                    value={editFormData.donationValue}
                                    onChange={handleEditChange}
                                    className={styles.input}
                                    required
                                    min="1"
                                    step="0.01"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Description: *</label>
                                <textarea
                                    name="description"
                                    value={editFormData.description}
                                    onChange={handleEditChange}
                                    className={styles.textarea}
                                    required
                                    rows={4}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Tax ID:</label>
                                <input
                                    type="text"
                                    name="taxId"
                                    value={editFormData.taxId}
                                    onChange={handleEditChange}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="submit" className={styles.saveButton}>
                                    Save Changes
                                </button>
                                <button 
                                    type="button" 
                                    className={styles.cancelButton}
                                    onClick={() => setEditingDonation(null)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
