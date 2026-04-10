'use client'

import { useEffect, useState, useCallback } from 'react'
import AdminLayout from '../dashboard/AdminLayout'
import styles from './Expenses.module.css'

interface ExpenseBill {
    id: number
    sr_no: number | null
    description: string
    amount: number
    date: string
    category: string
    vendor: string
    status: 'pending' | 'paid'
    notes: string | null
    image_url: string | null
    created_at: string
    bill_no: string | null
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<ExpenseBill[]>([])
    const [filteredExpenses, setFilteredExpenses] = useState<ExpenseBill[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [selectedMonth, setSelectedMonth] = useState<string>('all')
    const [selectedYear, setSelectedYear] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [srNoSort, setSrNoSort] = useState<'asc' | 'desc' | 'none'>('none')
    const [editingExpense, setEditingExpense] = useState<ExpenseBill | null>(null)

    const fetchExpenses = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/expenses')
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()
            if (data.success) {
                // Ensure amounts are numbers (backend should handle this, but double-check)
                const formattedExpenses = (data.expenses || []).map((expense: ExpenseBill) => ({
                    ...expense,
                    amount: typeof expense.amount === 'number' 
                        ? expense.amount 
                        : (typeof expense.amount === 'string' ? parseFloat(expense.amount) || 0 : 0)
                }))
                setExpenses(formattedExpenses)
            } else {
                console.error('Failed to fetch expenses:', data.error)
                setExpenses([])
            }
        } catch (error) {
            console.error('Error fetching expenses:', error)
            setExpenses([])
        } finally {
            setLoading(false)
        }
    }, [])

    const filterExpenses = useCallback(() => {
        try {
            if (!expenses || expenses.length === 0) {
                setFilteredExpenses([])
                return
            }

            let filtered = [...expenses]

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                filtered = filtered.filter(
                    (e) =>
                        e.description?.toLowerCase().includes(q) ||
                        e.vendor?.toLowerCase().includes(q) ||
                        e.bill_no?.toLowerCase().includes(q) ||
                        e.category?.toLowerCase().includes(q) ||
                        (e.sr_no != null && String(e.sr_no).includes(q))
                )
            }

            // Filter by year
            if (selectedYear && selectedYear !== 'all') {
                filtered = filtered.filter(expense => {
                    if (!expense || !expense.date) return false
                    try {
                        const expenseDate = new Date(expense.date)
                        if (isNaN(expenseDate.getTime())) return false
                        const expenseYear = expenseDate.getFullYear().toString()
                        return expenseYear === selectedYear
                    } catch (error) {
                        console.error('Error parsing date for expense:', expense?.id, error)
                        return false
                    }
                })
            }

            // Filter by month
            if (selectedMonth && selectedMonth !== 'all') {
                filtered = filtered.filter(expense => {
                    if (!expense || !expense.date) return false
                    try {
                        const expenseDate = new Date(expense.date)
                        if (isNaN(expenseDate.getTime())) return false
                        const expenseMonth = (expenseDate.getMonth() + 1).toString()
                        return expenseMonth === selectedMonth || expenseMonth === selectedMonth.padStart(2, '0')
                    } catch (error) {
                        console.error('Error parsing date for expense:', expense?.id, error)
                        return false
                    }
                })
            }

            // Sr No / Bill No sort
            if (srNoSort !== 'none') {
                filtered.sort((a, b) => {
                    const valA = a.sr_no != null ? String(a.sr_no) : (a.bill_no || '')
                    const valB = b.sr_no != null ? String(b.sr_no) : (b.bill_no || '')
                    if (srNoSort === 'asc') {
                        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
                    }
                    return valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' })
                })
            }

            setFilteredExpenses(filtered)
        } catch (error) {
            console.error('Error in filterExpenses:', error)
            setFilteredExpenses(expenses || [])
        }
    }, [expenses, selectedMonth, selectedYear, searchQuery, srNoSort])

    useEffect(() => {
        fetchExpenses()
    }, [fetchExpenses])

    useEffect(() => {
        filterExpenses()
    }, [filterExpenses])

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this expense bill?')) return

        try {
            const response = await fetch(`/api/expenses/${id}`, {
                method: 'DELETE'
            })
            const data = await response.json()
            if (data.success) {
                fetchExpenses()
            } else {
                alert(data.error || 'Failed to delete expense')
            }
        } catch (error) {
            console.error('Error deleting expense:', error)
            alert('Failed to delete expense')
        }
    }

    const handleEdit = (expense: ExpenseBill) => {
        setEditingExpense(expense)
        setShowAddModal(true)
    }

    const handleView = (expense: ExpenseBill) => {
        if (typeof window === 'undefined') return
        
        if (!expense?.image_url) {
            alert('No image available for this expense')
            return
        }
        
        try {
            // Use Next.js API route as proxy to avoid CORS issues
            const imagePath = encodeURIComponent(expense.image_url)
            const proxyUrl = `/api/expenses/image?path=${imagePath}`
            window.open(proxyUrl, '_blank')
        } catch (error) {
            console.error('Error opening image:', error)
            alert('Failed to open image: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
    }

    const handleDownload = async (expense: ExpenseBill) => {
        if (typeof window === 'undefined') return
        
        if (!expense?.image_url) {
            alert('No image available for this expense')
            return
        }
        
        try {
            // Use Next.js API route as proxy to avoid CORS issues
            const imagePath = encodeURIComponent(expense.image_url)
            const proxyUrl = `/api/expenses/image?path=${imagePath}`
            
            console.log('Downloading image via proxy:', proxyUrl)
            
            // Fetch the image through Next.js API proxy
            const response = await fetch(proxyUrl)
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
            }
            
            const blob = await response.blob()
            
            // Create download link
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.style.display = 'none'
            
            // Generate filename
            const fileExtension = expense.image_url.split('.').pop() || 'jpg'
            const fileName = expense.description 
                ? `${expense.description.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}.${fileExtension}`
                : `expense_${expense.id || 'image'}.${fileExtension}`
            
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            
            // Cleanup
            setTimeout(() => {
                window.URL.revokeObjectURL(url)
                if (document.body.contains(a)) {
                    document.body.removeChild(a)
                }
            }, 100)
        } catch (error) {
            console.error('Error downloading image:', error)
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            alert(`Failed to download image: ${errorMsg}\n\nPossible solutions:\n1. Check if backend server is running\n2. Verify BACKEND_URL in .env.local is correct\n3. Ensure image file exists on server`)
        }
    }

    const generateExpenseVoucherPDF = (expense: ExpenseBill) => {
        if (typeof window === 'undefined') return

        const printWindow = window.open('', '_blank')
        if (!printWindow) {
            alert('Please allow popups for this website to generate the PDF')
            return
        }

        // Helper function to convert number to words (Indian style)
        const numberToWords = (num: number): string => {
            if (num === 0) return 'Zero'
            
            const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
            const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
            const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
            
            const convert = (n: number): string => {
                if (n < 10) return ones[n]
                if (n < 20) return teens[n - 10]
                if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
                if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
                if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
                if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
                return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
            }
            
            const rupees = Math.floor(num)
            const paise = Math.round((num - rupees) * 100)
            
            let result = convert(rupees) + ' Rupees'
            if (paise > 0) {
                result += ' and ' + convert(paise) + ' Paise'
            }
            result += ' Only'
            return result
        }

        const formatDate = (dateString: string) => {
            try {
                const date = new Date(dateString)
                const day = date.getDate().toString().padStart(2, '0')
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                const year = date.getFullYear()
                return `${day}/${month}/${year}`
            } catch {
                return dateString
            }
        }

        const regNo = 'F721833346'
        const amountInWords = numberToWords(expense.amount)

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Expense Voucher - ${expense.description}</title>
                <style>
                    @media print {
                        @page { 
                            margin: 10mm;
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
                        font-size: 12px;
                        line-height: 1.4;
                    }
                    .voucher-container {
                        max-width: 800px;
                        margin: 0 auto;
                        border: 2px solid #000;
                        padding: 20px;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .header h1 {
                        margin: 0 0 5px 0;
                        font-size: 24px;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    .header h2 {
                        margin: 5px 0;
                        font-size: 18px;
                        font-weight: bold;
                    }
                    .header p {
                        margin: 3px 0;
                        font-size: 11px;
                    }
                    .date-section {
                        text-align: right;
                        margin-bottom: 20px;
                        font-size: 12px;
                    }
                    .info-section {
                        margin-bottom: 20px;
                    }
                    .info-row {
                        display: flex;
                        margin-bottom: 10px;
                    }
                    .info-label {
                        font-weight: bold;
                        min-width: 80px;
                    }
                    .info-value {
                        flex: 1;
                        border-bottom: 1px solid #000;
                        padding-left: 10px;
                    }
                    .expense-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                    }
                    .expense-table th,
                    .expense-table td {
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                    }
                    .expense-table th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                        text-align: center;
                    }
                    .expense-table .sr-no {
                        width: 60px;
                        text-align: center;
                    }
                    .expense-table .bill-no {
                        width: 100px;
                        text-align: center;
                    }
                    .expense-table .total {
                        width: 100px;
                        text-align: right;
                    }
                    .total-row {
                        font-weight: bold;
                    }
                    .amount-words {
                        margin: 15px 0;
                        padding: 10px;
                        border: 1px solid #000;
                    }
                    .amount-words-label {
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .signature-section {
                        margin-top: 40px;
                        display: flex;
                        justify-content: space-between;
                    }
                    .signature-box {
                        text-align: center;
                        width: 200px;
                    }
                    .signature-line {
                        border-top: 1px solid #000;
                        margin-top: 60px;
                        padding-top: 5px;
                        font-weight: bold;
                    }
                    .no-print {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 2px dashed #ccc;
                    }
                    .no-print button {
                        padding: 12px 30px;
                        background: #c12727;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        font-size: 14px;
                        cursor: pointer;
                        margin: 0 10px;
                    }
                    .no-print button:hover {
                        background: #a01f1f;
                    }
                </style>
            </head>
            <body>
                <div class="voucher-container">
                    <div class="header">
                        <h1>EXPENSE VOUCHER</h1>
                        <h2>NAAD DHYAS FOUNDATION</h2>
                        <p>At Post: Deravan, Tal: Patan, Dist.: Satara</p>
                        <p>Reg. No. ${regNo}</p>
                        <p>Contact: 7721833346 | Email: naaddhyas@gmailcom</p>
                    </div>

                    <div class="date-section">
                        <strong>Date:</strong> ${formatDate(expense.date)}
                    </div>

                    <div class="info-section">
                        <div class="info-row">
                            <span class="info-label">SR NO:</span>
                            <span class="info-value">${expense.sr_no != null ? String(expense.sr_no).padStart(3, '0') : (expense.id || '—')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span class="info-value">${expense.vendor || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Address:</span>
                            <span class="info-value">${expense.notes || ''}</span>
                        </div>
                    </div>

                    <table class="expense-table">
                        <thead>
                            <tr>
                                <th class="sr-no">SR NO</th>
                                <th>DESCRIPTION</th>
                                <th class="bill-no">Bill No</th>
                                <th class="total">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="sr-no">${expense.sr_no != null ? String(expense.sr_no).padStart(3, '0') : '1'}</td>
                                <td>${expense.description}</td>
                                <td class="bill-no">${expense.bill_no || (expense.sr_no != null ? String(expense.sr_no).padStart(3, '0') : expense.id)}</td>
                                <td class="total">₹${expense.amount.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td class="sr-no">2</td>
                                <td></td>
                                <td class="bill-no"></td>
                                <td class="total"></td>
                            </tr>
                            <tr>
                                <td class="sr-no">3</td>
                                <td></td>
                                <td class="bill-no"></td>
                                <td class="total"></td>
                            </tr>
                            <tr>
                                <td class="sr-no">4</td>
                                <td></td>
                                <td class="bill-no"></td>
                                <td class="total"></td>
                            </tr>
                            <tr>
                                <td class="sr-no">5</td>
                                <td></td>
                                <td class="bill-no"></td>
                                <td class="total"></td>
                            </tr>
                            <tr>
                                <td class="sr-no">6</td>
                                <td></td>
                                <td class="bill-no"></td>
                                <td class="total"></td>
                            </tr>
                            <tr>
                                <td class="sr-no">7</td>
                                <td></td>
                                <td class="bill-no"></td>
                                <td class="total"></td>
                            </tr>
                            <tr>
                                <td class="sr-no">8</td>
                                <td></td>
                                <td class="bill-no"></td>
                                <td class="total"></td>
                            </tr>
                            <tr class="total-row">
                                <td colspan="3" style="text-align: right; padding-right: 10px;">Total</td>
                                <td class="total">₹${expense.amount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="amount-words">
                        <div class="amount-words-label">In Words:</div>
                        <div>${amountInWords}</div>
                    </div>

                    <div class="signature-section">
                        <div class="signature-box">
                            <div class="signature-line">Prepared By:</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line">Approved By:</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line">Received By:</div>
                        </div>
                    </div>
                </div>

                <div class="no-print">
                    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
                    <button onclick="window.close()">✖️ Close</button>
                </div>

                <script>
                    // Auto-focus for better UX
                    window.onload = function() {
                        // Optional: Auto-print
                        // setTimeout(() => window.print(), 500);
                    };
                </script>
            </body>
            </html>
        `)

        printWindow.document.close()
    }

    const calculateTotals = () => {
        try {
            if (!filteredExpenses || !Array.isArray(filteredExpenses) || filteredExpenses.length === 0) {
                return { total: 0, paid: 0, pending: 0, paidCount: 0, pendingCount: 0 }
            }
            
            // Helper function to safely parse amount (handles both number and string from database)
            const parseAmount = (expense: ExpenseBill): number => {
                if (!expense) return 0
                const amount = expense.amount
                if (typeof amount === 'number') {
                    return isNaN(amount) ? 0 : amount
                }
                if (typeof amount === 'string') {
                    const parsed = parseFloat(amount)
                    return isNaN(parsed) ? 0 : parsed
                }
                return 0
            }
            
            const total = filteredExpenses.reduce((sum, expense) => {
                return sum + parseAmount(expense)
            }, 0)
            
            const paid = filteredExpenses
                .filter(expense => expense && expense.status === 'paid')
                .reduce((sum, expense) => {
                    return sum + parseAmount(expense)
                }, 0)
            
            const pending = filteredExpenses
                .filter(expense => expense && expense.status === 'pending')
                .reduce((sum, expense) => {
                    return sum + parseAmount(expense)
                }, 0)

            return { 
                total, 
                paid, 
                pending, 
                paidCount: filteredExpenses.filter(e => e && e.status === 'paid').length, 
                pendingCount: filteredExpenses.filter(e => e && e.status === 'pending').length 
            }
        } catch (error) {
            console.error('Error calculating totals:', error)
            return { total: 0, paid: 0, pending: 0, paidCount: 0, pendingCount: 0 }
        }
    }

    const totals = calculateTotals()
    const { total, paid, pending, paidCount, pendingCount } = totals

    const months = [
        { value: 'all', label: 'All Months' },
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' }
    ]

    const currentYear = typeof window !== 'undefined' 
        ? new Date().getFullYear() 
        : 2024
    const years = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString())
    const monthNames: { [key: string]: string } = {
        '01': 'January', '02': 'February', '03': 'March', '04': 'April',
        '05': 'May', '06': 'June', '07': 'July', '08': 'August',
        '09': 'September', '10': 'October', '11': 'November', '12': 'December'
    }

    const handleDownloadPDF = () => {
        if (filteredExpenses.length === 0) {
            alert('No expenses to download')
            return
        }
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
            alert('Please allow popups to use print/PDF')
            return
        }
        let filterInfo = `Total Records: ${filteredExpenses.length}`
        if (selectedMonth !== 'all') filterInfo += ` | Month: ${monthNames[selectedMonth.padStart(2, '0')] || selectedMonth}`
        if (selectedYear !== 'all') filterInfo += ` | Year: ${selectedYear}`
        if (srNoSort !== 'none') filterInfo += ` | Sr No: ${srNoSort === 'asc' ? 'Ascending' : 'Descending'}`

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Expense Bills Report</title>
                <style>
                    @media print { @page { margin: 10mm; size: A4 landscape; } body { margin: 0; padding: 0; } .no-print { display: none; } }
                    body { font-family: Arial, sans-serif; padding: 10px; font-size: 10px; }
                    h1 { color: #8b0000; text-align: center; margin: 10px 0; font-size: 18px; }
                    h2 { text-align: center; margin: 5px 0; font-size: 14px; color: #333; }
                    .filter-info { text-align: center; margin: 10px 0; font-size: 9px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; }
                    th { background: #8b0000; color: white; padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #666; }
                    td { padding: 6px 4px; border: 1px solid #ddd; }
                    tr:nth-child(even) { background: #f5f5f5; }
                    .amount { text-align: right; font-weight: bold; color: #10b981; }
                    .footer { margin-top: 20px; text-align: center; font-size: 8px; color: #999; }
                    .no-print button { padding: 10px 20px; background: #8b0000; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 0 10px; }
                </style>
            </head>
            <body>
                <h1>Swargumphan / Naad Dhyas Foundation</h1>
                <h2>Expense Bills Report</h2>
                <div class="filter-info">${filterInfo}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Sr No</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Bill No</th>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Vendor</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredExpenses.map((e) => `
                            <tr>
                                <td>${e.sr_no != null ? String(e.sr_no).padStart(3, '0') : '-'}</td>
                                <td>${e.description || '-'}</td>
                                <td class="amount">₹${(typeof e.amount === 'number' ? e.amount : parseFloat(e.amount as any) || 0).toFixed(2)}</td>
                                <td>${e.bill_no || '-'}</td>
                                <td>${e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                                <td>${e.category || '-'}</td>
                                <td>${e.vendor || '-'}</td>
                                <td>${e.status || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">Generated on ${new Date().toLocaleString('en-IN')}</div>
                <div class="no-print">
                    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
                    <button onclick="window.close()">Close</button>
                </div>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    return (
        <AdminLayout title="Expense Bills Management">
            <div className={styles.expensesContainer}>
                <div className={styles.headerSection}>
                    <div>
                        <h2>Track and manage all your business expenses</h2>
                        <p>Professional Data Center Services</p>
                    </div>
                </div>

                <div className={styles.summaryCards}>
                    <div className={styles.summaryCard}>
                        <div className={styles.cardContent}>
                            <div className={styles.cardLabel}>Total Expenses</div>
                            <div className={styles.cardAmount}>₹{total.toFixed(2)}</div>
                            <div className={styles.cardSubtext}>{filteredExpenses?.length || 0} bills</div>
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        <div className={styles.cardContent}>
                            <div className={styles.cardLabel}>Paid Amount</div>
                            <div className={`${styles.cardAmount} ${styles.paid}`}>₹{paid.toFixed(2)}</div>
                            <div className={styles.cardSubtext}>{paidCount} paid bills</div>
                            <div className={styles.cardIcon}>✓</div>
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        <div className={styles.cardContent}>
                            <div className={styles.cardLabel}>Pending Amount</div>
                            <div className={`${styles.cardAmount} ${styles.pending}`}>₹{pending.toFixed(2)}</div>
                            <div className={styles.cardSubtext}>{pendingCount} pending bills</div>
                            <div className={styles.cardIcon}>⏰</div>
                        </div>
                    </div>
                </div>

                <div className={styles.actionsSection}>
                    <button 
                        className={styles.addButton}
                        onClick={() => {
                            setEditingExpense(null)
                            setShowAddModal(true)
                        }}
                    >
                        + Add New Bill
                    </button>

                    <div className={styles.filters} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                        <label>Filters:</label>
                        <select
                            value={srNoSort}
                            onChange={(e) => setSrNoSort(e.target.value as 'asc' | 'desc' | 'none')}
                            className={styles.filterSelect}
                        >
                            <option value="none">Sort Sr No: No Sort</option>
                            <option value="asc">Sort Sr No: Ascending</option>
                            <option value="desc">Sort Sr No: Descending</option>
                        </select>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">All Months</option>
                            {months.map(month => (
                                <option key={month.value} value={month.value}>{month.label}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">All Years</option>
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Search by description, vendor, bill no, category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.filterSelect}
                            style={{ minWidth: '200px' }}
                        />
                        {(selectedMonth !== 'all' || selectedYear !== 'all' || searchQuery || srNoSort !== 'none') && (
                            <button
                                className={styles.clearFilters}
                                onClick={() => {
                                    setSelectedMonth('all')
                                    setSelectedYear('all')
                                    setSearchQuery('')
                                    setSrNoSort('none')
                                }}
                            >
                                ✕ Clear Filters
                            </button>
                        )}
                        {filteredExpenses.length > 0 && (
                            <button
                                onClick={handleDownloadPDF}
                                style={{
                                    padding: '8px 16px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                }}
                            >
                                📄 Download PDF ({filteredExpenses.length})
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.tableSection}>
                    <div className={styles.tableHeader}>
                        <h3>📄 Expense Bills</h3>
                        <p>Manage all your expense bills and receipts</p>
                    </div>

                    {loading ? (
                        <div className={styles.loading}>Loading expenses...</div>
                    ) : !filteredExpenses || filteredExpenses.length === 0 ? (
                        <div className={styles.emptyState}>No expense bills found</div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.expensesTable}>
                                <thead>
                                    <tr>
                                        <th>Sr. No.</th>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th>Bill No</th>
                                        <th>Date</th>
                                        <th>Category</th>
                                        <th>Vendor</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses && filteredExpenses.length > 0 ? (
                                        filteredExpenses.map((expense) => {
                                            if (!expense || !expense.id) return null
                                            
                                            // Parse amount - handle both string and number from database
                                            const expenseAmountNum = typeof expense.amount === 'number' 
                                                ? expense.amount 
                                                : (typeof expense.amount === 'string' ? parseFloat(expense.amount) : 0)
                                            const expenseAmount = !isNaN(expenseAmountNum) ? expenseAmountNum.toFixed(2) : '0.00'
                                            
                                            const formattedDate = (() => {
                                                if (!expense.date) return 'N/A'
                                                try {
                                                    const date = new Date(expense.date)
                                                    if (isNaN(date.getTime())) return 'N/A'
                                                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                } catch {
                                                    return 'N/A'
                                                }
                                            })()
                                            
                                            const expenseStatus = expense.status || 'pending'
                                            
                                            const srNoDisplay = expense.sr_no != null
                                                ? String(expense.sr_no).padStart(3, '0')
                                                : '—'

                                            return (
                                                <tr key={expense.id}>
                                                    <td className={styles.srNoCell}>{srNoDisplay}</td>
                                                    <td>
                                                        <div className={styles.descriptionCell}>
                                                            <span>{expense.description || '-'}</span>
                                                            {expense.image_url && (
                                                                <span className={styles.fileAttachment}>
                                                                    📎 {expense.image_url.split('/').pop() || 'image'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className={styles.amountCell}>₹{expenseAmount}</td>
                                                    <td>{expense.bill_no || '-'}</td>
                                                    <td>{formattedDate}</td>
                                                    <td>
                                                        <span className={styles.categoryTag}>{expense.category || 'Other'}</span>
                                                    </td>
                                                    <td>{expense.vendor || '-'}</td>
                                                    <td>
                                                        <span className={`${styles.statusTag} ${styles[expenseStatus]}`}>
                                                            {expenseStatus === 'paid' ? '✓ paid' : '⏰ pending'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className={styles.actionButtons}>
                                                            {expense.image_url && (
                                                                <>
                                                                    <button 
                                                                        className={styles.actionBtn}
                                                                        onClick={() => handleView(expense)}
                                                                        title="View"
                                                                    >
                                                                        👁️
                                                                    </button>
                                                                    <button 
                                                                        className={styles.actionBtn}
                                                                        onClick={() => handleDownload(expense)}
                                                                        title="Download Image"
                                                                    >
                                                                        ⬇️
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button 
                                                                className={styles.actionBtn}
                                                                onClick={() => generateExpenseVoucherPDF(expense)}
                                                                title="Download Voucher PDF"
                                                            >
                                                                📄
                                                            </button>
                                                            <button 
                                                                className={styles.actionBtn}
                                                                onClick={() => handleEdit(expense)}
                                                                title="Edit"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button 
                                                                className={styles.actionBtn}
                                                                onClick={() => handleDelete(expense.id)}
                                                                title="Delete"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                                No expense bills found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showAddModal && (
                <AddExpenseModal
                    expense={editingExpense}
                    onClose={() => {
                        setShowAddModal(false)
                        setEditingExpense(null)
                    }}
                    onSuccess={() => {
                        setShowAddModal(false)
                        setEditingExpense(null)
                        fetchExpenses()
                    }}
                />
            )}
        </AdminLayout>
    )
}

// Add Expense Modal Component
function AddExpenseModal({ expense, onClose, onSuccess }: { expense: ExpenseBill | null, onClose: () => void, onSuccess: () => void }) {
    const getFormattedDate = (dateString: string | undefined | null) => {
        if (!dateString) return new Date().toISOString().split('T')[0]
        try {
            // Handle different date formats from database
            const date = new Date(dateString)
            if (isNaN(date.getTime())) {
                return new Date().toISOString().split('T')[0]
            }
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        } catch (e) {
            console.error('Error formatting date:', e)
            return new Date().toISOString().split('T')[0]
        }
    }

    const [formData, setFormData] = useState({
        description: expense?.description || '',
        amount: expense?.amount || 0,
        date: getFormattedDate(expense?.date),
        category: expense?.category || 'Other',
        vendor: expense?.vendor || '',
        status: expense?.status || 'pending',
        notes: expense?.notes || '',
        billNo: expense?.bill_no || '',
        image: null as File | null
    })
    const [imagePreview, setImagePreview] = useState<string | null>(() => {
        if (!expense?.image_url) return null
        if (expense.image_url.startsWith('http')) {
            return expense.image_url
        }
        // Use Next.js API proxy to avoid CORS issues
        const imagePath = encodeURIComponent(expense.image_url)
        return `/api/expenses/image?path=${imagePath}`
    })
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [fileInputKey, setFileInputKey] = useState(0)

    const categories = ['Other', 'Utilities', 'Rent', 'Salary', 'Office Supplies', 'Marketing', 'Travel', 'Maintenance', 'Software', 'Hardware']

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFormData({ ...formData, image: file })
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!formData.description.trim()) {
            alert('Please enter a description')
            return
        }
        if (formData.amount <= 0) {
            alert('Please enter a valid amount')
            return
        }
        if (!formData.vendor.trim()) {
            alert('Please enter a vendor name')
            return
        }

        try {
            setSubmitting(true)
            const formDataToSend = new FormData()
            formDataToSend.append('description', formData.description.trim())
            
            // Ensure amount is properly formatted as a number string
            const amountValue = typeof formData.amount === 'number' && !isNaN(formData.amount) 
                ? formData.amount.toString() 
                : (formData.amount || '0').toString()
            formDataToSend.append('amount', amountValue)
            
            formDataToSend.append('date', formData.date)
            formDataToSend.append('category', formData.category)
            formDataToSend.append('vendor', formData.vendor.trim())
            formDataToSend.append('status', formData.status)
            formDataToSend.append('notes', formData.notes || '')
            formDataToSend.append('billNo', formData.billNo.trim())
            if (formData.image) {
                formDataToSend.append('image', formData.image)
            }

            const url = expense ? `/api/expenses/${expense.id}` : '/api/expenses'
            const method = expense ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                body: formDataToSend
            })

            const data = await response.json()
            if (data.success) {
                setError(null)
                onSuccess()
            } else {
                const errorMsg = data.error || 'Failed to save expense'
                setError(errorMsg)
                alert(errorMsg)
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to save expense'
            console.error('Error saving expense:', error)
            setError(errorMsg)
            alert(errorMsg)
        } finally {
            setSubmitting(false)
        }
    }


    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{expense ? 'Edit Expense Bill' : 'Add New Expense Bill'}</h2>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>
                
                <form onSubmit={handleSubmit} className={styles.expenseForm}>
                    {error && (
                        <div className={styles.errorMessage} style={{ color: 'red', padding: '10px', marginBottom: '15px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
                            {error}
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label>
                            Bill Image (Optional)
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className={styles.fileInput}
                                key={fileInputKey}
                            />
                            {imagePreview && (
                                <div className={styles.imagePreview}>
                                    <img src={imagePreview} alt="Preview" />
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setImagePreview(null)
                                            setFormData({ ...formData, image: null })
                                            setFileInputKey(prev => prev + 1)
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label>
                            Description *
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Enter bill description"
                                required
                            />
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label>
                            Amount *
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.amount || ''}
                                onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '') {
                                        setFormData({ ...formData, amount: 0 })
                                    } else {
                                        const numValue = parseFloat(value)
                                        if (!isNaN(numValue) && numValue >= 0) {
                                            setFormData({ ...formData, amount: numValue })
                                        }
                                    }
                                }}
                                placeholder="0.00"
                                required
                            />
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label>
                            Date *
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label>
                            Category
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label>
                            Vendor *
                            <input
                                type="text"
                                value={formData.vendor}
                                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                                placeholder="Enter vendor name"
                                required
                            />
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label>
                            Bill No
                            <input
                                type="text"
                                value={formData.billNo}
                                onChange={(e) => setFormData({ ...formData, billNo: e.target.value })}
                                placeholder="Enter bill number"
                            />
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label>
                            Status
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'paid' })}
                            >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                            </select>
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label>
                            Notes
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Optional notes..."
                                rows={3}
                            />
                        </label>
                    </div>

                    <div className={styles.formActions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.submitButton} disabled={submitting}>
                            {submitting ? 'Saving...' : (expense ? 'Update Bill' : 'Create Bill')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
