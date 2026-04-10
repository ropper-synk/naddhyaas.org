'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '../dashboard/AdminLayout'
import layoutStyles from '../dashboard/AdminLayout.module.css'

interface InvoiceRecord {
    donationId: number
    admissionId: number
    fullName: string
    branch: string
    formNo: string | null
    doNo: string | null
    amountPaid: number
    transactionId: string | null
    paymentType: string | null
    paidDate: string
}

export default function AdminInvoicesPage() {
    const router = useRouter()
    const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
    const [filteredInvoices, setFilteredInvoices] = useState<InvoiceRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [isRootAdmin, setIsRootAdmin] = useState(false)
    const [isBranchAdmin, setIsBranchAdmin] = useState(false)
    const [selectedBranch, setSelectedBranch] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [formNoSort, setFormNoSort] = useState<'asc' | 'desc' | 'none'>('none')
    const [selectedMonth, setSelectedMonth] = useState<string>('all')
    const [selectedYear, setSelectedYear] = useState<string>('all')

    useEffect(() => {
        const adminRole = localStorage.getItem('adminRole')
        const isRootAdminLoggedIn = localStorage.getItem('isRootAdmin')
        const isBranchAdminLoggedIn = localStorage.getItem('isBranchAdmin')

        if (adminRole === 'ROOT' || isRootAdminLoggedIn === 'true') {
            setIsRootAdmin(true)
            fetchInvoices('ROOT')
        } else if (adminRole === 'BRANCH' || isBranchAdminLoggedIn === 'true') {
            setIsBranchAdmin(true)
            const adminBranch = localStorage.getItem('adminBranch')
            fetchInvoices('BRANCH', adminBranch || '')
        } else {
            router.push('/admin/login')
        }
    }, [router])

    const fetchInvoices = async (role: string, branch?: string) => {
        setLoading(true)
        try {
            const adminId = localStorage.getItem('adminId')
            const adminUsername = localStorage.getItem('adminUsername')
            const adminBranch = localStorage.getItem('adminBranch')

            console.log('[ADMIN INVOICES PAGE] Fetching invoices:', { role, branch: branch || adminBranch, adminId, adminUsername })

            const res = await fetch('/api/admin/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminRole: role,
                    adminBranch: branch || adminBranch,
                    adminId,
                    adminUsername,
                }),
            })
            
            console.log('[ADMIN INVOICES PAGE] Response status:', res.status)
            const data = await res.json()
            console.log('[ADMIN INVOICES PAGE] Response data:', { success: data.success, count: data.data?.length || 0, error: data.error })
            
            if (data.success && Array.isArray(data.data)) {
                console.log(`[ADMIN INVOICES PAGE] Successfully loaded ${data.data.length} invoices`)
                setInvoices(data.data)
                setFilteredInvoices(data.data)
            } else {
                console.warn('[ADMIN INVOICES PAGE] No invoices found or invalid response:', data)
                if (data.error) {
                    alert(`Failed to load invoices: ${data.error}`)
                }
                setInvoices([])
                setFilteredInvoices([])
            }
        } catch (error) {
            console.error('[ADMIN INVOICES PAGE] Error fetching invoices:', error)
            alert(`Error loading invoices: ${error instanceof Error ? error.message : 'Unknown error'}`)
            setInvoices([])
            setFilteredInvoices([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let list = [...invoices]
        
        // Branch filter
        if (isRootAdmin && selectedBranch !== 'all') {
            list = list.filter((i) => i.branch === selectedBranch)
        }
        
        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter(
                (i) =>
                    i.fullName?.toLowerCase().includes(q) ||
                    i.transactionId?.toLowerCase().includes(q) ||
                    i.formNo?.toLowerCase().includes(q) ||
                    i.doNo?.toLowerCase().includes(q)
            )
        }
        
        // Month filter
        if (selectedMonth !== 'all') {
            list = list.filter((i) => {
                if (!i.paidDate) return false
                const date = new Date(i.paidDate)
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                return month === selectedMonth
            })
        }
        
        // Year filter
        if (selectedYear !== 'all') {
            list = list.filter((i) => {
                if (!i.paidDate) return false
                const date = new Date(i.paidDate)
                return date.getFullYear().toString() === selectedYear
            })
        }
        
        // Form No sorting (within each branch group)
        if (formNoSort !== 'none') {
            // Group by branch first, then sort Form No within each branch
            const groupedByBranch: { [key: string]: InvoiceRecord[] } = {}
            list.forEach((inv) => {
                const branch = inv.branch || 'Unknown'
                if (!groupedByBranch[branch]) {
                    groupedByBranch[branch] = []
                }
                groupedByBranch[branch].push(inv)
            })
            
            // Sort Form No within each branch group
            Object.keys(groupedByBranch).forEach((branch) => {
                groupedByBranch[branch].sort((a, b) => {
                    const formNoA = a.formNo || ''
                    const formNoB = b.formNo || ''
                    if (formNoSort === 'asc') {
                        return formNoA.localeCompare(formNoB, undefined, { numeric: true, sensitivity: 'base' })
                    } else {
                        return formNoB.localeCompare(formNoA, undefined, { numeric: true, sensitivity: 'base' })
                    }
                })
            })
            
            // Flatten back to array (maintain branch grouping order)
            list = Object.values(groupedByBranch).flat()
        }
        
        setFilteredInvoices(list)
    }, [selectedBranch, searchQuery, invoices, isRootAdmin, formNoSort, selectedMonth, selectedYear])


    const handleLogout = () => {
        localStorage.removeItem('isAdminLoggedIn')
        localStorage.removeItem('isHeadAdminLoggedIn')
        localStorage.removeItem('isBranchAdmin')
        localStorage.removeItem('isRootAdmin')
        localStorage.removeItem('adminRole')
        localStorage.removeItem('adminId')
        localStorage.removeItem('adminUsername')
        localStorage.removeItem('adminBranch')
        localStorage.removeItem('rootAdminUsername')
        localStorage.removeItem('loggedInBranchId')
        router.push('/admin/login')
    }

    const handleRead = (donationId: number) => {
        window.open(`/invoice/transaction/${donationId}`, '_blank')
    }

    const handleDelete = async (donationId: number, fullName: string) => {
        if (!window.confirm(`Delete this invoice (₹ payment) for ${fullName}? This cannot be undone.`)) {
            return
        }
        try {
            const adminId = localStorage.getItem('adminId')
            const adminUsername = localStorage.getItem('adminUsername')
            const adminRole = localStorage.getItem('adminRole')
            const adminBranch = localStorage.getItem('adminBranch')

            const res = await fetch(`/api/admin/invoices/${donationId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId,
                    adminUsername,
                    adminRole: adminRole || 'ROOT',
                    adminBranch,
                }),
            })
            const data = await res.json()

            if (res.ok && data.success) {
                setInvoices((prev) => prev.filter((i) => i.donationId !== donationId))
                setFilteredInvoices((prev) => prev.filter((i) => i.donationId !== donationId))
            } else {
                alert(data.error || 'Failed to delete invoice')
            }
        } catch (error) {
            console.error('Error deleting invoice:', error)
            alert('Failed to delete invoice')
        }
    }

    const handleDownloadPDF = async () => {
        if (filteredInvoices.length === 0) {
            alert('No invoices to download')
            return
        }

        try {
            // Dynamic import for jsPDF (works better with Next.js)
            let jsPDF: any
            try {
                // @ts-ignore - jsPDF types will be available after npm install
                const jsPDFModule = await import('jspdf')
                jsPDF = jsPDFModule.default || jsPDFModule
                // If it's an object with a default property that's a class
                if (typeof jsPDF !== 'function' && jsPDFModule.default) {
                    jsPDF = jsPDFModule.default
                }
            } catch (importError) {
                console.error('Failed to import jsPDF:', importError)
                alert('PDF library not found. Please run: npm install jspdf')
                return
            }

            if (!jsPDF || typeof jsPDF !== 'function') {
                console.error('jsPDF is not a constructor:', jsPDF)
                alert('PDF library initialization failed. Please ensure jspdf is installed.')
                return
            }

            const pdf = new jsPDF('landscape', 'mm', 'a4')
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 10
            const tableStartY = 30
            let yPos = tableStartY
            const rowHeight = 8
            const colWidths = [25, 25, 30, 45, 25, 30, 50, 30, 25] // Form No, DO No, Branch, Name, Amount, Date, Transaction ID, Payment Type, ID
            const totalWidth = colWidths.reduce((a, b) => a + b, 0)
            const startX = (pageWidth - totalWidth) / 2

            // Header
            pdf.setFontSize(18)
            pdf.setTextColor(139, 0, 0) // Dark red
            pdf.text('Swargumphan Sangeet Vidyalaya', pageWidth / 2, 15, { align: 'center' })
            pdf.setFontSize(12)
            pdf.setTextColor(0, 0, 0)
            pdf.text('Student Invoices Report', pageWidth / 2, 22, { align: 'center' })

            // Filter info
            let filterInfo = `Total Records: ${filteredInvoices.length}`
            if (selectedBranch !== 'all') filterInfo += ` | Branch: ${selectedBranch}`
            if (selectedMonth !== 'all') filterInfo += ` | Month: ${monthNames[selectedMonth]}`
            if (selectedYear !== 'all') filterInfo += ` | Year: ${selectedYear}`
            if (formNoSort !== 'none') filterInfo += ` | Form No: ${formNoSort === 'asc' ? 'Ascending' : 'Descending'}`
            pdf.setFontSize(9)
            pdf.text(filterInfo, pageWidth / 2, 27, { align: 'center' })

            // Table headers
            pdf.setFontSize(8)
            pdf.setFont(undefined, 'bold')
            pdf.setTextColor(255, 255, 255)
            pdf.setFillColor(139, 0, 0)
            let xPos = startX
            const headers = ['Form No', 'DO No', 'Branch', 'Student Name', 'Amount', 'Date', 'Transaction ID', 'Payment Type', 'ID']
            headers.forEach((header, idx) => {
                pdf.rect(xPos, yPos - 5, colWidths[idx], rowHeight, 'F')
                pdf.text(header, xPos + colWidths[idx] / 2, yPos - 1, { align: 'center' })
                xPos += colWidths[idx]
            })
            yPos += rowHeight

            // Table rows
            pdf.setFont(undefined, 'normal')
            pdf.setTextColor(0, 0, 0)
            let rowNum = 0

            filteredInvoices.forEach((inv, index) => {
                // Check if we need a new page
                if (yPos + rowHeight > pageHeight - margin) {
                    pdf.addPage()
                    yPos = tableStartY
                    // Redraw headers on new page
                    pdf.setFont(undefined, 'bold')
                    pdf.setTextColor(255, 255, 255)
                    pdf.setFillColor(139, 0, 0)
                    xPos = startX
                    headers.forEach((header, idx) => {
                        pdf.rect(xPos, yPos - 5, colWidths[idx], rowHeight, 'F')
                        pdf.text(header, xPos + colWidths[idx] / 2, yPos - 1, { align: 'center' })
                        xPos += colWidths[idx]
                    })
                    yPos += rowHeight
                    pdf.setFont(undefined, 'normal')
                    pdf.setTextColor(0, 0, 0)
                }

                // Alternate row colors
                if (rowNum % 2 === 0) {
                    pdf.setFillColor(245, 245, 245)
                    pdf.rect(startX, yPos - 5, totalWidth, rowHeight, 'F')
                }

                xPos = startX
                pdf.setFontSize(7)

                // Form No
                pdf.text(inv.formNo || '-', xPos + 2, yPos - 1)
                xPos += colWidths[0]

                // DO No
                pdf.text(inv.doNo || '-', xPos + 2, yPos - 1)
                xPos += colWidths[1]

                // Branch
                pdf.text(inv.branch || '-', xPos + 2, yPos - 1)
                xPos += colWidths[2]

                // Student Name (truncate if too long)
                const name = inv.fullName || '-'
                pdf.text(name.length > 20 ? name.substring(0, 17) + '...' : name, xPos + 2, yPos - 1)
                xPos += colWidths[3]

                // Amount
                pdf.text(`₹${inv.amountPaid?.toLocaleString() || '0'}`, xPos + 2, yPos - 1)
                xPos += colWidths[4]

                // Date
                const dateStr = inv.paidDate
                    ? new Date(inv.paidDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                      })
                    : '-'
                pdf.text(dateStr, xPos + 2, yPos - 1)
                xPos += colWidths[5]

                // Transaction ID (truncate if too long)
                const txnId = inv.transactionId || '-'
                pdf.text(txnId.length > 15 ? txnId.substring(0, 12) + '...' : txnId, xPos + 2, yPos - 1)
                xPos += colWidths[6]

                // Payment Type
                pdf.text(inv.paymentType || '-', xPos + 2, yPos - 1)
                xPos += colWidths[7]

                // Donation ID
                pdf.text(inv.donationId.toString(), xPos + 2, yPos - 1)
                xPos += colWidths[8]

                yPos += rowHeight
                rowNum++
            })

            // Footer
            const totalPages = pdf.internal.pages.length - 1
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i)
                pdf.setFontSize(8)
                pdf.setTextColor(128, 128, 128)
                pdf.text(
                    `Page ${i} of ${totalPages} | Generated on ${new Date().toLocaleString('en-IN')}`,
                    pageWidth / 2,
                    pageHeight - 5,
                    { align: 'center' }
                )
            }

            // Generate filename
            let filename = 'Student_Invoices'
            if (selectedBranch !== 'all') filename += `_${selectedBranch.replace(/\s+/g, '_')}`
            if (selectedMonth !== 'all') filename += `_${monthNames[selectedMonth]}`
            if (selectedYear !== 'all') filename += `_${selectedYear}`
            filename += `_${new Date().toISOString().split('T')[0]}.pdf`

            pdf.save(filename)
        } catch (error: any) {
            console.error('Error generating PDF:', error)
            console.error('Error details:', {
                message: error?.message,
                stack: error?.stack,
                name: error?.name
            })
            
            // Fallback: Try using browser print functionality
            if (error?.message?.includes('jspdf') || error?.message?.includes('Cannot find module')) {
                const usePrint = window.confirm(
                    'PDF library not installed. Would you like to use browser print instead?\n\n' +
                    'To enable PDF download, please run: npm install jspdf\n\n' +
                    'Click OK to print the filtered invoices, or Cancel to dismiss.'
                )
                
                if (usePrint) {
                    handlePrintView()
                    return
                }
            }
            
            const errorMessage = error?.message || 'Unknown error'
            alert(`Failed to generate PDF: ${errorMessage}\n\nPlease check:\n1. Run: npm install jspdf\n2. Check browser console (F12) for details`)
        }
    }

    const handlePrintView = () => {
        // Create a printable HTML view
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
            alert('Please allow popups to use print functionality')
            return
        }

        const monthNames: { [key: string]: string } = {
            '01': 'January', '02': 'February', '03': 'March', '04': 'April',
            '05': 'May', '06': 'June', '07': 'July', '08': 'August',
            '09': 'September', '10': 'October', '11': 'November', '12': 'December'
        }

        let filterInfo = `Total Records: ${filteredInvoices.length}`
        if (selectedBranch !== 'all') filterInfo += ` | Branch: ${selectedBranch}`
        if (selectedMonth !== 'all') filterInfo += ` | Month: ${monthNames[selectedMonth]}`
        if (selectedYear !== 'all') filterInfo += ` | Year: ${selectedYear}`
        if (formNoSort !== 'none') filterInfo += ` | Form No: ${formNoSort === 'asc' ? 'Ascending' : 'Descending'}`

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Student Invoices Report</title>
                <style>
                    @media print {
                        @page { margin: 10mm; size: A4 landscape; }
                        body { margin: 0; padding: 0; }
                        .no-print { display: none; }
                    }
                    body {
                        font-family: Arial, sans-serif;
                        padding: 10px;
                        font-size: 10px;
                    }
                    h1 {
                        color: #8b0000;
                        text-align: center;
                        margin: 10px 0;
                        font-size: 18px;
                    }
                    h2 {
                        text-align: center;
                        margin: 5px 0;
                        font-size: 14px;
                        color: #333;
                    }
                    .filter-info {
                        text-align: center;
                        margin: 10px 0;
                        font-size: 9px;
                        color: #666;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                        font-size: 9px;
                    }
                    th {
                        background: #8b0000;
                        color: white;
                        padding: 8px 4px;
                        text-align: left;
                        font-weight: bold;
                        border: 1px solid #666;
                    }
                    td {
                        padding: 6px 4px;
                        border: 1px solid #ddd;
                    }
                    tr:nth-child(even) {
                        background: #f5f5f5;
                    }
                    .amount {
                        text-align: right;
                        font-weight: bold;
                        color: #10b981;
                    }
                    .footer {
                        margin-top: 20px;
                        text-align: center;
                        font-size: 8px;
                        color: #999;
                        border-top: 1px solid #ddd;
                        padding-top: 10px;
                    }
                    .no-print {
                        text-align: center;
                        margin: 20px;
                    }
                    .no-print button {
                        padding: 10px 20px;
                        background: #8b0000;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        font-size: 14px;
                        cursor: pointer;
                        margin: 0 10px;
                    }
                </style>
            </head>
            <body>
                <h1>Swargumphan Sangeet Vidyalaya</h1>
                <h2>Student Invoices Report</h2>
                <div class="filter-info">${filterInfo}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Form No</th>
                            <th>DO No</th>
                            <th>Branch</th>
                            <th>Student Name</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Transaction ID</th>
                            <th>Payment Type</th>
                            <th>ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredInvoices.map((inv) => `
                            <tr>
                                <td>${inv.formNo || '-'}</td>
                                <td>${inv.doNo || '-'}</td>
                                <td>${inv.branch || '-'}</td>
                                <td>${inv.fullName || '-'}</td>
                                <td class="amount">₹${inv.amountPaid?.toLocaleString() || '0'}</td>
                                <td>${inv.paidDate ? new Date(inv.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                                <td>${inv.transactionId || '-'}</td>
                                <td>${inv.paymentType || '-'}</td>
                                <td>${inv.donationId}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    Generated on ${new Date().toLocaleString('en-IN')}
                </div>
                <div class="no-print">
                    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
                    <button onclick="window.close()">Close</button>
                </div>
                <script>
                    window.onload = function() {
                        // Auto-print after a short delay
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    const uniqueBranches = isRootAdmin ? Array.from(new Set(invoices.map((i) => i.branch))).sort() : []
    const currentBranch = isBranchAdmin ? localStorage.getItem('adminBranch') : null
    
    // Get unique months and years from invoices
    const uniqueMonths = Array.from(
        new Set(
            invoices
                .filter((i) => i.paidDate)
                .map((i) => {
                    const date = new Date(i.paidDate)
                    return (date.getMonth() + 1).toString().padStart(2, '0')
                })
        )
    ).sort()
    
    const uniqueYears = Array.from(
        new Set(
            invoices
                .filter((i) => i.paidDate)
                .map((i) => {
                    const date = new Date(i.paidDate)
                    return date.getFullYear().toString()
                })
        )
    ).sort((a, b) => parseInt(b) - parseInt(a)) // Descending order (newest first)
    
    const monthNames: { [key: string]: string } = {
        '01': 'January', '02': 'February', '03': 'March', '04': 'April',
        '05': 'May', '06': 'June', '07': 'July', '08': 'August',
        '09': 'September', '10': 'October', '11': 'November', '12': 'December'
    }

    const headerActions = (
        <>
            <a href="/admin/dashboard" className={layoutStyles.headerButton}>
                Dashboard
            </a>
            <button onClick={handleLogout} className={layoutStyles.logoutButton}>
                Logout
            </button>
        </>
    )

    return (
        <AdminLayout
            title={isRootAdmin ? 'Student Invoices' : `${currentBranch} – Invoices`}
            headerActions={headerActions}
        >
            <div className={layoutStyles.sectionCard} style={{ marginBottom: '30px' }}>
                <div className={layoutStyles.sectionHeader}>
                    <h2>Filters, Sort & Search</h2>
                    <p>Filter, sort and search invoice records</p>
                </div>
                <div className={layoutStyles.sectionBody}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px',
                            alignItems: 'end',
                        }}
                    >
                        {isRootAdmin && (
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: '500',
                                        color: '#374151',
                                        fontSize: '14px',
                                    }}
                                >
                                    Filter by Branch:
                                </label>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        backgroundColor: '#fff',
                                        fontSize: '14px',
                                        color: '#111827',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <option value="all">All Branches</option>
                                    {uniqueBranches.map((b) => (
                                        <option key={b} value={b}>
                                            {b}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    fontSize: '14px',
                                }}
                            >
                                Sort Form No:
                            </label>
                            <select
                                value={formNoSort}
                                onChange={(e) => setFormNoSort(e.target.value as 'asc' | 'desc' | 'none')}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    backgroundColor: '#fff',
                                    fontSize: '14px',
                                    color: '#111827',
                                    cursor: 'pointer',
                                }}
                            >
                                <option value="none">No Sort</option>
                                <option value="asc">Ascending (A-Z, 1-9)</option>
                                <option value="desc">Descending (Z-A, 9-1)</option>
                            </select>
                        </div>
                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    fontSize: '14px',
                                }}
                            >
                                Filter by Month:
                            </label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    backgroundColor: '#fff',
                                    fontSize: '14px',
                                    color: '#111827',
                                    cursor: 'pointer',
                                }}
                            >
                                <option value="all">All Months</option>
                                {uniqueMonths.map((m) => (
                                    <option key={m} value={m}>
                                        {monthNames[m] || m}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    fontSize: '14px',
                                }}
                            >
                                Filter by Year:
                            </label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    backgroundColor: '#fff',
                                    fontSize: '14px',
                                    color: '#111827',
                                    cursor: 'pointer',
                                }}
                            >
                                <option value="all">All Years</option>
                                {uniqueYears.map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    fontSize: '14px',
                                }}
                            >
                                Search:
                            </label>
                            <input
                                type="text"
                                placeholder="Search by name, form no, or transaction ID"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    color: '#111827',
                                }}
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {filteredInvoices.length > 0 && (
                            <button
                                onClick={handleDownloadPDF}
                                style={{
                                    padding: '10px 20px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                                title="Download filtered invoices as PDF"
                            >
                                📄 Download PDF ({filteredInvoices.length} records)
                            </button>
                        )}
                        {(formNoSort !== 'none' || selectedMonth !== 'all' || selectedYear !== 'all' || selectedBranch !== 'all' || searchQuery) && (
                            <button
                                onClick={() => {
                                    setFormNoSort('none')
                                    setSelectedMonth('all')
                                    setSelectedYear('all')
                                    setSelectedBranch('all')
                                    setSearchQuery('')
                                }}
                                style={{
                                    padding: '10px 20px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                }}
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className={layoutStyles.sectionCard}>
                <div className={layoutStyles.sectionHeader}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div>
                            <h2>All Student Invoices</h2>
                            <p>Fee payment records with Read and Delete ({filteredInvoices.length} records)</p>
                        </div>
                    </div>
                </div>
                <div className={layoutStyles.sectionBody}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                            <div
                                style={{
                                    display: 'inline-block',
                                    width: '40px',
                                    height: '40px',
                                    border: '4px solid #e5e7eb',
                                    borderTopColor: '#3b82f6',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    marginBottom: '16px',
                                }}
                            />
                            <p style={{ fontSize: '16px', fontWeight: '500' }}>Loading invoices...</p>
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                            <p style={{ fontSize: '18px', marginBottom: '10px', fontWeight: '600' }}>
                                No invoice records found
                            </p>
                            <p style={{ marginBottom: '20px' }}>Try adjusting filters or search</p>
                        </div>
                    ) : (
                        <div className={layoutStyles.tableWrapper}>
                            <table className={layoutStyles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>
                                            Form No
                                            {formNoSort !== 'none' && (
                                                <span style={{ marginLeft: '5px', fontSize: '12px' }}>
                                                    {formNoSort === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </th>
                                        <th>DO No</th>
                                        <th>Branch</th>
                                        <th>Student Name</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                        <th>Transaction ID</th>
                                        <th>Payment Type</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.map((inv) => (
                                        <tr key={inv.donationId}>
                                            <td>{inv.formNo || '-'}</td>
                                            <td>{inv.doNo || '-'}</td>
                                            <td>{inv.branch}</td>
                                            <td style={{ fontWeight: '600' }}>{inv.fullName}</td>
                                            <td style={{ fontWeight: '600', color: '#10b981' }}>
                                                ₹{inv.amountPaid?.toLocaleString() ?? '0'}
                                            </td>
                                            <td>
                                                {inv.paidDate
                                                    ? new Date(inv.paidDate).toLocaleDateString('en-IN', {
                                                          day: 'numeric',
                                                          month: 'short',
                                                          year: 'numeric',
                                                      })
                                                    : '-'}
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#6b7280' }}>
                                                {inv.transactionId || '-'}
                                            </td>
                                            <td>
                                                <span className={layoutStyles.statusBadge}>{inv.paymentType || '-'}</span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRead(inv.donationId)}
                                                    className={`${layoutStyles.actionBtn} ${layoutStyles.edit}`}
                                                    title="View / Download Invoice"
                                                >
                                                    Read
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(inv.donationId, inv.fullName)}
                                                    className={`${layoutStyles.actionBtn} ${layoutStyles.delete}`}
                                                    title="Delete this payment record"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </AdminLayout>
    )
}
