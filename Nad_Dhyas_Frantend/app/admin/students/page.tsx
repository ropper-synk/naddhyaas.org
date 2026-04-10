'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '../dashboard/AdminLayout'
import layoutStyles from '../dashboard/AdminLayout.module.css'

interface StudentRecord {
    admission_id: number
    branch: string
    admission_date: string
    full_name: string
    address: string | null
    phone: string | null
    date_of_birth: string | null
    age: number | null
    email_id: string | null
    form_no: string | null
    instrumental_selection: string | null
    indian_classical_vocal: string | null
    dance: string | null
    education_job_details: string | null
    joining_date: string | null
    diploma_admission_year: string | null
    payment_type: string | null
    transaction_id: string | null
    amount_paid: number | null
    total_fee?: number | null
    remaining_fee?: number | null
    donation_id: number | null
}

export default function AllStudentsPage() {
    const router = useRouter()
    const [students, setStudents] = useState<StudentRecord[]>([])
    const [filteredStudents, setFilteredStudents] = useState<StudentRecord[]>([])
    const [selectedBranch, setSelectedBranch] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [isRootAdmin, setIsRootAdmin] = useState(false)
    const [isRootUser, setIsRootUser] = useState(false)
    const [isBranchAdmin, setIsBranchAdmin] = useState(false)
    const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
    const [editFormData, setEditFormData] = useState({
        fullName: '',
        address: '',
        phone: '',
        dateOfBirth: '',
        emailId: '',
        formNo: '',
        branch: '',
        admissionDate: '',
        instrumentalSelection: '',
        indianClassicalVocal: '',
        dance: '',
        educationJobDetails: '',
        joiningDate: '',
        diplomaAdmissionYear: ''
    })

    useEffect(() => {
        const adminRole = localStorage.getItem('adminRole')
        const isRootAdminLoggedIn = localStorage.getItem('isRootAdmin')
        const isBranchAdminLoggedIn = localStorage.getItem('isBranchAdmin')

        if (adminRole === 'ROOT' || isRootAdminLoggedIn === 'true') {
            setIsRootAdmin(true)
            const adminUsername = localStorage.getItem('adminUsername')
            const rootAdminUsername = localStorage.getItem('rootAdminUsername')
            if (adminUsername === 'root' || rootAdminUsername === 'root') {
                setIsRootUser(true)
            }
            fetchStudents('ROOT')
        } else if (adminRole === 'BRANCH' || isBranchAdminLoggedIn === 'true') {
            setIsBranchAdmin(true)
            const adminBranch = localStorage.getItem('adminBranch')
            fetchStudents('BRANCH', adminBranch || '')
        } else {
            router.push('/admin/login')
        }
    }, [router])

    const fetchStudents = async (role: string, branch?: string) => {
        setLoading(true)
        try {
            const adminId = localStorage.getItem('adminId')
            const adminUsername = localStorage.getItem('adminUsername')
            const adminBranch = localStorage.getItem('adminBranch')

            const studentsRes = await fetch('/api/admin/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    adminRole: role,
                    adminBranch: branch || adminBranch,
                    adminId: adminId,
                    adminUsername: adminUsername
                }),
            })
            const studentsData = await studentsRes.json()
            if (studentsData.success) {
                setStudents(studentsData.data)
                setFilteredStudents(studentsData.data)
            }
        } catch (error) {
            console.error('Error fetching students:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isRootAdmin || isBranchAdmin) {
            let filtered = students

            // Filter by branch (only for ROOT admin)
            if (isRootAdmin && selectedBranch !== 'all') {
                filtered = filtered.filter(s => s.branch === selectedBranch)
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                filtered = filtered.filter(s =>
                    s.full_name?.toLowerCase().includes(query) ||
                    s.email_id?.toLowerCase().includes(query) ||
                    s.transaction_id?.toLowerCase().includes(query) ||
                    s.form_no?.toLowerCase().includes(query) ||
                    s.phone?.toLowerCase().includes(query)
                )
            }

            setFilteredStudents(filtered)
        }
    }, [selectedBranch, searchQuery, students, isRootAdmin, isBranchAdmin])

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

    const handleEditStudent = (student: StudentRecord) => {
        setEditingStudent(student)
        setEditFormData({
            fullName: student.full_name || '',
            address: student.address || '',
            phone: student.phone || '',
            dateOfBirth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
            emailId: student.email_id || '',
            formNo: student.form_no || '',
            branch: student.branch || '',
            admissionDate: student.admission_date ? student.admission_date.split('T')[0] : '',
            instrumentalSelection: student.instrumental_selection || '',
            indianClassicalVocal: student.indian_classical_vocal || '',
            dance: student.dance || '',
            educationJobDetails: student.education_job_details || '',
            joiningDate: student.joining_date ? student.joining_date.split('T')[0] : '',
            diplomaAdmissionYear: student.diploma_admission_year || ''
        })
    }

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setEditFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingStudent) return
        try {
            const adminId = localStorage.getItem('adminId')
            const adminUsername = localStorage.getItem('adminUsername')
            const adminRole = localStorage.getItem('adminRole')

            const res = await fetch(`/api/admin/students/${editingStudent.admission_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminRole: adminRole || 'ROOT',
                    adminId,
                    adminUsername,
                    fullName: editFormData.fullName,
                    address: editFormData.address || null,
                    phone: editFormData.phone || null,
                    dateOfBirth: editFormData.dateOfBirth || null,
                    emailId: editFormData.emailId || null,
                    formNo: editFormData.formNo || null,
                    branch: editFormData.branch || null,
                    admissionDate: editFormData.admissionDate || null,
                    instrumentalSelection: editFormData.instrumentalSelection || null,
                    indianClassicalVocal: editFormData.indianClassicalVocal || null,
                    dance: editFormData.dance || null,
                    educationJobDetails: editFormData.educationJobDetails || null,
                    joiningDate: editFormData.joiningDate || null,
                    diplomaAdmissionYear: editFormData.diplomaAdmissionYear || null
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                alert('Student record updated successfully')
                setEditingStudent(null)
                if (isRootAdmin) fetchStudents('ROOT')
                else if (isBranchAdmin) {
                    const adminBranch = localStorage.getItem('adminBranch')
                    fetchStudents('BRANCH', adminBranch || '')
                }
            } else {
                alert(data.error || 'Failed to update student record')
            }
        } catch (error) {
            console.error('Error updating student:', error)
            alert('An error occurred while updating the student. Please try again.')
        }
    }

    const handleDeleteStudent = async (admissionId: number, studentName: string) => {
        if (!isRootAdmin) {
            alert('Only root administrators can delete students. Branch admins do not have delete permissions.')
            return
        }

        const confirmMessage = `Are you sure you want to delete student "${studentName}"?\n\nThis action cannot be undone and will permanently delete:\n- Student admission record\n- Music preferences\n- Payment information\n- Signatures\n- Login credentials\n\nThis will remove the student from the database and admin panel.`
        
        if (!window.confirm(confirmMessage)) {
            return
        }

        try {
            const adminId = localStorage.getItem('adminId')
            const adminUsername = localStorage.getItem('adminUsername')
            const adminRole = localStorage.getItem('adminRole')

            const res = await fetch(`/api/admin/students/${admissionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    adminRole: adminRole || 'ROOT',
                    adminId,
                    adminUsername
                })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                alert(`Student "${studentName}" has been deleted successfully.`)
                if (isRootAdmin) {
                    fetchStudents('ROOT')
                } else if (isBranchAdmin) {
                    const adminBranch = localStorage.getItem('adminBranch')
                    fetchStudents('BRANCH', adminBranch || '')
                }
            } else {
                alert(data.error || 'Failed to delete student')
            }
        } catch (error) {
            console.error('Error deleting student:', error)
            alert('An error occurred while deleting the student. Please try again.')
        }
    }

    const uniqueBranches = isRootAdmin ? Array.from(new Set(students.map(s => s.branch))).sort() : []
    const currentBranch = isBranchAdmin ? localStorage.getItem('adminBranch') : null

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
            title={isRootAdmin ? 'All Student Records' : `${currentBranch} - Student Records`}
            headerActions={headerActions}
        >
            {/* Filters and Search */}
            <div className={layoutStyles.sectionCard} style={{ marginBottom: '30px' }}>
                <div className={layoutStyles.sectionHeader}>
                    <h2>Filters & Search</h2>
                    <p>Filter and search student records</p>
                </div>
                <div className={layoutStyles.sectionBody}>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        alignItems: 'end'
                    }}>
                        {isRootAdmin && (
                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '8px', 
                                    fontWeight: '500', 
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>
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
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                >
                                    <option value="all">All Branches</option>
                                    {uniqueBranches.map(branch => (
                                        <option key={branch} value={branch}>{branch}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {isBranchAdmin && (
                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '8px', 
                                    fontWeight: '500', 
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>
                                    Branch:
                                </label>
                                <input
                                    type="text"
                                    value={currentBranch || ''}
                                    readOnly
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        backgroundColor: '#f9fafb',
                                        fontSize: '14px',
                                        color: '#6b7280'
                                    }}
                                />
                            </div>
                        )}
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                fontWeight: '500', 
                                color: '#374151',
                                fontSize: '14px'
                            }}>
                                Search:
                            </label>
                            <input
                                type="text"
                                placeholder="Search by name, email, phone, form no, or transaction ID"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    color: '#111827',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className={layoutStyles.sectionCard}>
                <div className={layoutStyles.sectionHeader}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div>
                            <h2>All Student Records</h2>
                            <p>Complete list of all student records ({filteredStudents.length} records)</p>
                        </div>
                    </div>
                </div>
                <div className={layoutStyles.sectionBody}>
                    {loading ? (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '60px 20px',
                            color: '#6b7280'
                        }}>
                            <div style={{ 
                                display: 'inline-block',
                                width: '40px',
                                height: '40px',
                                border: '4px solid #e5e7eb',
                                borderTopColor: '#3b82f6',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                marginBottom: '16px'
                            }}></div>
                            <p style={{ fontSize: '16px', fontWeight: '500' }}>Loading student records...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '60px 20px',
                            color: '#6b7280'
                        }}>
                            <p style={{ fontSize: '18px', marginBottom: '10px', fontWeight: '600' }}>No student records found</p>
                            <p style={{ marginBottom: '20px' }}>Try adjusting your search or filter criteria</p>
                        </div>
                    ) : (
                        <div className={layoutStyles.tableWrapper}>
                            <table className={layoutStyles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Form No</th>
                                        <th>Branch</th>
                                        <th>Full Name</th>
                                        <th>Year</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Admission Date</th>
                                        <th>Payment Type</th>
                                        <th>Total Fee</th>
                                        <th>Amount Paid</th>
                                        <th>Remaining Fee</th>
                                        <th>Transaction ID</th>
                                        <th>Courses</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student) => (
                                        <tr key={student.admission_id}>
                                            <td>{student.form_no || '-'}</td>
                                            <td>{student.branch}</td>
                                            <td style={{ fontWeight: '600' }}>{student.full_name}</td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    backgroundColor: student.diploma_admission_year === 'Third Year' ? '#fce7f3' : 
                                                                   student.diploma_admission_year === 'Second Year' ? '#dbeafe' : '#d1fae5',
                                                    color: student.diploma_admission_year === 'Third Year' ? '#9f1239' : 
                                                          student.diploma_admission_year === 'Second Year' ? '#1e40af' : '#065f46'
                                                }}>
                                                    {student.diploma_admission_year || 'First Year'}
                                                </span>
                                            </td>
                                            <td>{student.email_id || '-'}</td>
                                            <td>{student.phone || '-'}</td>
                                            <td>{student.admission_date ? new Date(student.admission_date).toLocaleDateString() : '-'}</td>
                                            <td>
                                                <span className={layoutStyles.statusBadge}>
                                                    {student.payment_type || '-'}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: '600', color: '#1e40af' }}>
                                                ₹{student.total_fee?.toLocaleString() || (student.diploma_admission_year === 'Third Year' ? '12,200' : '10,200')}
                                            </td>
                                            <td style={{ fontWeight: '600', color: '#10b981' }}>
                                                ₹{student.amount_paid ? student.amount_paid.toLocaleString() : '0'}
                                            </td>
                                            <td style={{ 
                                                fontWeight: '600', 
                                                color: (student.remaining_fee || 10200) > 0 ? '#f59e0b' : '#10b981'
                                            }}>
                                                ₹{((student.remaining_fee !== undefined && student.remaining_fee !== null) 
                                                    ? Math.max(0, student.remaining_fee).toLocaleString() 
                                                    : ((student.diploma_admission_year === 'Third Year' ? 12200 : 10200) - (student.amount_paid || 0)).toLocaleString())}
                                            </td>
                                            <td style={{ 
                                                fontFamily: 'monospace', 
                                                fontSize: '0.85rem', 
                                                color: '#6b7280'
                                            }}>
                                                {student.transaction_id || '-'}
                                            </td>
                                            <td>
                                                {[
                                                    student.instrumental_selection,
                                                    student.indian_classical_vocal,
                                                    student.dance
                                                ].filter(Boolean).join(', ') || '-'}
                                            </td>
                                            <td>
                                                <div className={layoutStyles.actionButtons}>
                                                    <button
                                                        onClick={() => handleEditStudent(student)}
                                                        className={`${layoutStyles.actionBtn} ${layoutStyles.edit}`}
                                                        title="Edit Student"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteStudent(student.admission_id, student.full_name)}
                                                        className={`${layoutStyles.actionBtn} ${layoutStyles.delete}`}
                                                        title={isRootAdmin ? 'Delete Student' : 'Only root administrators can delete'}
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
                </div>
            </div>

            {/* Edit Student Modal */}
            {editingStudent && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                    onClick={() => setEditingStudent(null)}
                >
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            maxWidth: '560px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            padding: '24px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Edit Student Record</h2>
                            <button
                                onClick={() => setEditingStudent(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    padding: '0 4px',
                                    lineHeight: 1
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStudent}>
                            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Full Name *</label>
                                    <input name="fullName" value={editFormData.fullName} onChange={handleEditChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Form No</label>
                                    <input name="formNo" value={editFormData.formNo} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Branch</label>
                                    <input name="branch" value={editFormData.branch} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Admission Date</label>
                                    <input name="admissionDate" type="date" value={editFormData.admissionDate} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Address</label>
                                    <input name="address" value={editFormData.address} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Phone</label>
                                    <input name="phone" value={editFormData.phone} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Email</label>
                                    <input name="emailId" type="email" value={editFormData.emailId} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Date of Birth</label>
                                    <input name="dateOfBirth" type="date" value={editFormData.dateOfBirth} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Year</label>
                                    <select name="diplomaAdmissionYear" value={editFormData.diplomaAdmissionYear} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                        <option value="">Select</option>
                                        <option value="First Year">First Year</option>
                                        <option value="Second Year">Second Year</option>
                                        <option value="Third Year">Third Year</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Joining Date</label>
                                    <input name="joiningDate" type="date" value={editFormData.joiningDate} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Instrument</label>
                                    <input name="instrumentalSelection" value={editFormData.instrumentalSelection} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Vocal</label>
                                    <input name="indianClassicalVocal" value={editFormData.indianClassicalVocal} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Dance</label>
                                    <input name="dance" value={editFormData.dance} onChange={handleEditChange} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Education / Job Details</label>
                                    <textarea name="educationJobDetails" value={editFormData.educationJobDetails} onChange={handleEditChange} rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setEditingStudent(null)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontWeight: 500 }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </AdminLayout>
    )
}

