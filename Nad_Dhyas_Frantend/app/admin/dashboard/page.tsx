'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { mockStudentAnalytics, mockDashboardStats, mockHeadDashboardStats, mockBranchExpenses, StudentAnalytics, DashboardStats as ImportedDashboardStats, BranchStats, BranchExpense } from '@/app/utils/mockData'
import AdminLayout from './AdminLayout'
import BranchFeesChart from './BranchFeesChart'
import ClassWiseChart from './ClassWiseChart'
import layoutStyles from './AdminLayout.module.css'
import dashboardStyles from './Dashboard.module.css'

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
    payment_type: string | null
    transaction_id: string | null
    amount_paid: number | null
    donation_id: number | null
}

interface ClassWiseStats {
    year: string
    count: number
}

interface RootDashboardStats {
    totalStudents: number
    totalFees: number
    totalExpectedFee?: number
    remainingFees?: number
    studentsWithRemainingFee?: number
    recentAdmissions: number
    branchStats: Array<{
        branch: string
        count: number
        total_fees: number
        total_expected_fee?: number
        remaining_fees?: number
        students_with_remaining_fee?: number
    }>
    classWiseStats?: ClassWiseStats[]
}

export default function AdminDashboardPage() {
    const router = useRouter()
    const [analytics, setAnalytics] = useState<StudentAnalytics[]>([])
    const [stats, setStats] = useState<ImportedDashboardStats | null>(null)
    const [headStats, setHeadStats] = useState<BranchStats[] | null>(null)
    const [isHeadAdmin, setIsHeadAdmin] = useState(false)
    const [isBranchAdmin, setIsBranchAdmin] = useState(false)
    const [isRootAdmin, setIsRootAdmin] = useState(false)
    const [isRootUser, setIsRootUser] = useState(false) // Only "root" user can delete
    const [branchId, setBranchId] = useState<string>('')
    const [branchExpenses, setBranchExpenses] = useState<BranchExpense[]>([])
    const [selectedMonth, setSelectedMonth] = useState<string>('all')
    
    // Root admin state
    const [students, setStudents] = useState<StudentRecord[]>([])
    const [filteredStudents, setFilteredStudents] = useState<StudentRecord[]>([])
    const [selectedBranch, setSelectedBranch] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [dashboardStats, setDashboardStats] = useState<RootDashboardStats | null>(null)

    useEffect(() => {
        const adminRole = localStorage.getItem('adminRole')
        const isRootAdminLoggedIn = localStorage.getItem('isRootAdmin')
        const isBranchAdminLoggedIn = localStorage.getItem('isBranchAdmin')
        const isHeadAdminLoggedIn = localStorage.getItem('isHeadAdminLoggedIn')
        const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn')
        const loggedInBranchId = localStorage.getItem('loggedInBranchId')
        const adminBranch = localStorage.getItem('adminBranch')
        const adminUsername = localStorage.getItem('adminUsername')

        console.log('🔐 Admin Dashboard - Checking login state:', {
            adminRole,
            isRootAdminLoggedIn,
            isBranchAdminLoggedIn,
            isHeadAdminLoggedIn,
            isAdminLoggedIn,
            adminBranch,
            adminUsername
        })

        if (adminRole === 'ROOT' || isRootAdminLoggedIn === 'true') {
            console.log('✅ Detected ROOT admin login')
            setIsRootAdmin(true)
            // Check if logged in user is specifically "root"
            const rootAdminUsername = localStorage.getItem('rootAdminUsername')
            if (adminUsername === 'root' || rootAdminUsername === 'root') {
                setIsRootUser(true)
                console.log(' ROOT user detected (can delete)')
            }
            fetchAdminData('ROOT')
        } else if (adminRole === 'BRANCH' || isBranchAdminLoggedIn === 'true') {
            console.log(' Detected BRANCH admin login for:', adminBranch)
            setIsBranchAdmin(true)
            setBranchId(adminBranch || '')
            fetchAdminData('BRANCH', adminBranch || '')
        } else if (isHeadAdminLoggedIn === 'true') {
            console.log(' Detected HEAD admin login')
            setIsHeadAdmin(true)
            setHeadStats(mockHeadDashboardStats)
        } else if (isAdminLoggedIn === 'true') {
            console.log('Detected legacy admin login')
            setAnalytics(mockStudentAnalytics)
            setStats(mockDashboardStats)
        } else {
            console.log(' No admin login detected, redirecting to login page')
            router.push('/admin/login')
        }
    }, [router])

    const fetchAdminData = async (role: string, branch?: string) => {
        setLoading(true)
        try {
            const adminId = localStorage.getItem('adminId')
            const adminUsername = localStorage.getItem('adminUsername')
            const adminBranch = localStorage.getItem('adminBranch')
            
            console.log('🔍 Fetching admin data with:', { 
                role, 
                branch: branch || adminBranch, 
                adminId, 
                adminUsername 
            })
            
            // Fetch students with admin info
            console.log('📥 Fetching students...')
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
            console.log('📥 Students response:', studentsData)
            if (studentsData.success) {
                setStudents(studentsData.data)
                setFilteredStudents(studentsData.data)
                console.log('✅ Students loaded:', studentsData.data.length)
            } else {
                console.error('❌ Failed to load students:', studentsData.error)
            }

            // Fetch stats with admin info
            console.log('📊 Fetching stats...')
            const statsRes = await fetch('/api/admin/stats', {
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
            const statsData = await statsRes.json()
            console.log('📊 Stats response:', statsData)
            if (statsData.success) {
                setDashboardStats(statsData.stats)
                console.log('✅ Stats loaded:', statsData.stats)
            } else {
                console.error('❌ Failed to load stats:', statsData.error)
                // Set empty stats to prevent loading forever
                setDashboardStats({
                    totalStudents: 0,
                    totalFees: 0,
                    totalExpectedFee: 0,
                    remainingFees: 0,
                    studentsWithRemainingFee: 0,
                    recentAdmissions: 0,
                    branchStats: [],
                    classWiseStats: []
                })
            }
        } catch (error) {
            console.error('💥 Error fetching admin data:', error)
            // Set empty stats to show error state
            setDashboardStats({
                totalStudents: 0,
                totalFees: 0,
                totalExpectedFee: 0,
                remainingFees: 0,
                studentsWithRemainingFee: 0,
                recentAdmissions: 0,
                branchStats: [],
                classWiseStats: []
            })
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
                    s.transaction_id?.toLowerCase().includes(query)
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

    const handleDeleteStudent = async (admissionId: number, studentName: string) => {
        // Only root administrators can delete students
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
                // Refresh the student list
                if (isRootAdmin) {
                    fetchAdminData('ROOT')
                }
            } else {
                alert(data.error || 'Failed to delete student')
            }
        } catch (error) {
            console.error('Error deleting student:', error)
            alert('An error occurred while deleting the student. Please try again.')
        }
    }

    // Get unique branches for filter (only for ROOT admin)
    const uniqueBranches = isRootAdmin ? Array.from(new Set(students.map(s => s.branch))).sort() : []
    const currentBranch = isBranchAdmin ? localStorage.getItem('adminBranch') : null

    // Root Admin or Branch Admin Dashboard View
    if (isRootAdmin || isBranchAdmin) {
        const headerActions = (
            <>
                <button onClick={handleLogout} className={layoutStyles.logoutButton}>
                    Logout
                </button>
            </>
        )

        // Show loading state
        if (loading) {
            return (
                <AdminLayout 
                    title={isRootAdmin ? 'Root Admin Dashboard' : `${currentBranch} - Branch Admin Dashboard`}
                    headerActions={headerActions}
                >
                    <div style={{ padding: '50px', textAlign: 'center', color: '#6b7280' }}>
                        <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading dashboard...</div>
                        <div className={layoutStyles.spinner} style={{ margin: '0 auto' }}></div>
                    </div>
                </AdminLayout>
            )
        }

        // Show error state if no stats loaded (check for null/undefined, not empty data)
        if (!dashboardStats || dashboardStats === null) {
            return (
                <AdminLayout 
                    title={isRootAdmin ? 'Root Admin Dashboard' : `${currentBranch} - Branch Admin Dashboard`}
                    headerActions={headerActions}
                >
                    <div style={{ padding: '50px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                        <div style={{ fontSize: '24px', color: '#ef4444', marginBottom: '10px', fontWeight: 'bold' }}>
                            Failed to load dashboard data
                        </div>
                        <div style={{ color: '#6b7280', marginBottom: '30px', fontSize: '16px' }}>
                            Unable to connect to the backend server or fetch data.
                        </div>
                        
                        <div style={{ 
                            background: '#f3f4f6', 
                            padding: '20px', 
                            borderRadius: '8px', 
                            marginBottom: '30px',
                            textAlign: 'left'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#111827' }}>
                                Troubleshooting Steps:
                            </div>
                            <ol style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: '1.8' }}>
                                <li>Check if backend server is running on the correct port</li>
                                <li>Verify backend URL in frontend configuration</li>
                                <li>Check browser console (F12) for detailed error messages</li>
                                <li>Ensure database connection is working</li>
                                <li>Try logging out and logging in again</li>
                            </ol>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button 
                                onClick={() => {
                                    const role = isRootAdmin ? 'ROOT' : 'BRANCH'
                                    const branch = localStorage.getItem('adminBranch')
                                    fetchAdminData(role, branch || '')
                                }} 
                                style={{
                                    padding: '12px 24px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500'
                                }}
                            >
                                🔄 Retry Connection
                            </button>
                            <button 
                                onClick={() => window.location.reload()} 
                                style={{
                                    padding: '12px 24px',
                                    background: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500'
                                }}
                            >
                                🔃 Refresh Page
                            </button>
                            <button 
                                onClick={handleLogout} 
                                style={{
                                    padding: '12px 24px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500'
                                }}
                            >
                                🚪 Logout & Try Again
                            </button>
                        </div>

                        <div style={{ 
                            marginTop: '30px', 
                            padding: '15px', 
                            background: '#fef3c7', 
                            borderRadius: '8px',
                            border: '1px solid #fcd34d'
                        }}>
                            <div style={{ color: '#92400e', fontSize: '14px' }}>
                                <strong>💡 Tip:</strong> Press F12 to open browser console and check for error messages
                            </div>
                        </div>
                    </div>
                </AdminLayout>
            )
        }

        // Show "No Data" state when everything is 0 for branch admin
        if (isBranchAdmin && dashboardStats && dashboardStats.totalStudents === 0) {
            return (
                <AdminLayout 
                    title={`${currentBranch} - Branch Admin Dashboard`}
                    headerActions={headerActions}
                >
                    <div style={{ padding: '50px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
                        <div style={{ fontSize: '24px', color: '#6b7280', marginBottom: '10px', fontWeight: 'bold' }}>
                            No Student Records Found
                        </div>
                        <div style={{ color: '#6b7280', marginBottom: '30px', fontSize: '16px' }}>
                            No students found for branch: <strong>{currentBranch}</strong>
                        </div>
                        
                        <div style={{ 
                            background: '#f3f4f6', 
                            padding: '20px', 
                            borderRadius: '8px', 
                            marginBottom: '30px',
                            textAlign: 'left'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#111827' }}>
                                Possible Reasons:
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: '1.8' }}>
                                <li>No students have been registered for this branch yet</li>
                                <li>Branch name mismatch in database (check browser console for actual branch name)</li>
                                <li>Students registered under different branch name</li>
                                <li>Database connection issue</li>
                            </ul>
                        </div>

                        <div style={{ 
                            background: '#fef3c7', 
                            padding: '15px', 
                            borderRadius: '8px',
                            border: '1px solid #fcd34d',
                            marginBottom: '20px'
                        }}>
                            <div style={{ color: '#92400e', fontSize: '14px', textAlign: 'left' }}>
                                <strong>🔍 Debug Info (check console):</strong>
                                <div style={{ marginTop: '10px', fontFamily: 'monospace', fontSize: '12px' }}>
                                    Branch being queried: <strong>{currentBranch}</strong>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => {
                                const role = 'BRANCH'
                                const branch = localStorage.getItem('adminBranch')
                                console.log('🔄 Retrying with branch:', branch)
                                fetchAdminData(role, branch || '')
                            }} 
                            style={{
                                padding: '12px 24px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: '500'
                            }}
                        >
                            🔄 Retry Loading
                        </button>
                    </div>
                </AdminLayout>
            )
        }

        return (
            <AdminLayout 
                title={isRootAdmin ? 'Root Admin Dashboard' : `${currentBranch} - Branch Admin Dashboard`}
                headerActions={headerActions}
            >
                {/* Statistics Cards */}
                {dashboardStats && (
                    <div className={layoutStyles.statsGrid}>
                        <div className={`${layoutStyles.statCard} ${layoutStyles.primary}`}>
                            <div className={layoutStyles.statContent}>
                                <h3>Total Students</h3>
                                <div className={layoutStyles.statValue}>{dashboardStats.totalStudents}</div>
                                <p className={layoutStyles.statSubtext}>+{dashboardStats.recentAdmissions} recent admissions</p>
                            </div>
                        </div>
                        {isBranchAdmin ? (
                            <>
                                <div className={`${layoutStyles.statCard} ${layoutStyles.info}`}>
                                    <div className={layoutStyles.statContent}>
                                        <h3>💰 Total Expected Fee</h3>
                                        <div className={layoutStyles.statValue}>₹{((dashboardStats.totalExpectedFee || dashboardStats.totalStudents * 10000) || 0).toLocaleString()}</div>
                                        <p className={layoutStyles.statSubtext}>Based on diploma year fees</p>
                                    </div>
                                </div>
                                <div className={`${layoutStyles.statCard} ${layoutStyles.success}`}>
                                    <div className={layoutStyles.statContent}>
                                        <h3>✅ Paid Fees</h3>
                                        <div className={layoutStyles.statValue}>₹{dashboardStats.totalFees.toLocaleString()}</div>
                                        <p className={layoutStyles.statSubtext}>
                                            {((dashboardStats.totalFees / (dashboardStats.totalExpectedFee || dashboardStats.totalStudents * 10000 || 1)) * 100).toFixed(1)}% collected
                                        </p>
                                    </div>
                                </div>
                                <div className={`${layoutStyles.statCard} ${layoutStyles.warning}`}>
                                    <div className={layoutStyles.statContent}>
                                        <h3>⏳ Remaining Fees</h3>
                                        <div className={layoutStyles.statValue}>₹{((dashboardStats.remainingFees || ((dashboardStats.totalExpectedFee || dashboardStats.totalStudents * 10000) - dashboardStats.totalFees)) || 0).toLocaleString()}</div>
                                        <p className={layoutStyles.statSubtext}>{dashboardStats.studentsWithRemainingFee || 0} students with pending fees</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={`${layoutStyles.statCard} ${layoutStyles.success}`}>
                                    <div className={layoutStyles.statContent}>
                                        <h3>Total Fees Collected</h3>
                                        <div className={layoutStyles.statValue}>₹{dashboardStats.totalFees.toLocaleString()}</div>
                                        <p className={layoutStyles.statSubtext}>Total revenue</p>
                                    </div>
                                </div>
                                <div className={`${layoutStyles.statCard} ${layoutStyles.warning}`}>
                                    <div className={layoutStyles.statContent}>
                                        <h3>Students with Remaining Fees</h3>
                                        <div className={layoutStyles.statValue}>{dashboardStats.studentsWithRemainingFee || 0}</div>
                                        <p className={layoutStyles.statSubtext}>Fee pending</p>
                                    </div>
                                </div>
                                <div className={`${layoutStyles.statCard} ${layoutStyles.info}`}>
                                    <div className={layoutStyles.statContent}>
                                        <h3>Total Branches</h3>
                                        <div className={layoutStyles.statValue}>{dashboardStats.branchStats?.length || 0}</div>
                                        <p className={layoutStyles.statSubtext}>Active branches</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                    {/* Branch Statistics */}
                    {dashboardStats?.branchStats && dashboardStats.branchStats.length > 0 && isRootAdmin && (
                        <div className={layoutStyles.statsGrid} style={{ marginBottom: '30px' }}>
                            {dashboardStats.branchStats.map((branch, index) => {
                                const totalExpected = branch.total_expected_fee || (branch.count * 10000);
                                const remaining = branch.remaining_fees || (totalExpected - branch.total_fees);
                                return (
                                    <div key={index} className={layoutStyles.statCard}>
                                        <div className={layoutStyles.statContent}>
                                            <h3 style={{ color: '#c12727', marginBottom: '12px', fontSize: '16px' }}>{branch.branch}</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Students:</span>
                                                    <strong style={{ fontSize: '18px', color: '#111827' }}>{branch.count}</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Total Expected:</span>
                                                    <strong style={{ color: '#3b82f6', fontSize: '18px' }}>₹{totalExpected.toLocaleString()}</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Paid Fees:</span>
                                                    <strong style={{ color: '#10b981', fontSize: '18px' }}>₹{branch.total_fees.toLocaleString()}</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Remaining:</span>
                                                    <strong style={{ color: '#f59e0b', fontSize: '18px' }}>₹{Math.max(0, remaining).toLocaleString()}</strong>
                                                </div>
                                                {branch.students_with_remaining_fee !== undefined && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                                                        <span style={{ color: '#6b7280', fontSize: '13px' }}>Pending Students:</span>
                                                        <strong style={{ color: '#ef4444', fontSize: '16px' }}>{branch.students_with_remaining_fee}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Fee Collection Progress (Branch Admin Only) */}
                    {isBranchAdmin && dashboardStats && (
                        <div className={layoutStyles.sectionCard} style={{ marginBottom: '30px' }}>
                            <div className={layoutStyles.sectionHeader}>
                                <h2>Fee Collection Progress</h2>
                                <p>Detailed breakdown of fee collection status</p>
                            </div>
                            <div className={layoutStyles.sectionBody}>
                                <div style={{ padding: '20px' }}>
                                    {/* Progress Bar */}
                                    <div style={{ marginBottom: '30px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span style={{ fontWeight: '600', color: '#111827' }}>Overall Collection Progress</span>
                                            <span style={{ fontWeight: '600', color: '#10b981' }}>
                                                {((dashboardStats.totalFees / (dashboardStats.totalExpectedFee || dashboardStats.totalStudents * 10000 || 1)) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        <div style={{
                                            width: '100%',
                                            height: '30px',
                                            background: '#e5e7eb',
                                            borderRadius: '15px',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}>
                                            <div style={{
                                                width: `${(dashboardStats.totalFees / (dashboardStats.totalExpectedFee || dashboardStats.totalStudents * 10000 || 1)) * 100}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                                                transition: 'width 1s ease-in-out',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                paddingRight: '10px'
                                            }}>
                                                <span style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>
                                                    ₹{dashboardStats.totalFees.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '12px', color: '#6b7280' }}>
                                            <span>₹0</span>
                                            <span>₹{((dashboardStats.totalExpectedFee || dashboardStats.totalStudents * 10000) || 0).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Detailed Stats Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                        <div style={{ 
                                            padding: '15px', 
                                            background: '#f0f9ff', 
                                            borderRadius: '8px',
                                            border: '1px solid #bfdbfe'
                                        }}>
                                            <div style={{ fontSize: '12px', color: '#1e40af', marginBottom: '5px' }}>Total Expected</div>
                                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a' }}>
                                                ₹{((dashboardStats.totalExpectedFee || dashboardStats.totalStudents * 10000) || 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ 
                                            padding: '15px', 
                                            background: '#f0fdf4', 
                                            borderRadius: '8px',
                                            border: '1px solid #bbf7d0'
                                        }}>
                                            <div style={{ fontSize: '12px', color: '#065f46', marginBottom: '5px' }}>Total Collected</div>
                                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#065f46' }}>
                                                ₹{dashboardStats.totalFees.toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ 
                                            padding: '15px', 
                                            background: '#fef3c7', 
                                            borderRadius: '8px',
                                            border: '1px solid #fcd34d'
                                        }}>
                                            <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '5px' }}>Remaining Amount</div>
                                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>
                                                ₹{((dashboardStats.remainingFees || ((dashboardStats.totalExpectedFee || dashboardStats.totalStudents * 10000) - dashboardStats.totalFees)) || 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ 
                                            padding: '15px', 
                                            background: '#fee2e2', 
                                            borderRadius: '8px',
                                            border: '1px solid #fecaca'
                                        }}>
                                            <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '5px' }}>Students Pending</div>
                                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#991b1b' }}>
                                                {dashboardStats.studentsWithRemainingFee || 0}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Class-Wise Summary Cards */}
                    {dashboardStats?.classWiseStats && dashboardStats.classWiseStats.length > 0 && (
                        <>
                            <div className={layoutStyles.sectionCard} style={{ marginBottom: '30px' }}>
                                <div className={layoutStyles.sectionHeader}>
                                    <h2>Class-Wise Student Count</h2>
                                    <p>Distribution of students across diploma years</p>
                                </div>
                                <div className={layoutStyles.sectionBody}>
                                    <div className={layoutStyles.statsGrid}>
                                        {dashboardStats.classWiseStats.map((classData, index) => {
                                            const colors = {
                                                'First Year': { bg: '#dbeafe', text: '#1e40af', icon: '1️⃣' },
                                                'Second Year': { bg: '#d1fae5', text: '#065f46', icon: '2️⃣' },
                                                'Third Year': { bg: '#fed7aa', text: '#92400e', icon: '3️⃣' },
                                                'Not Specified': { bg: '#e5e7eb', text: '#374151', icon: '❓' }
                                            }
                                            const style = colors[classData.year as keyof typeof colors] || colors['Not Specified']
                                            
                                            return (
                                                <div key={index} className={layoutStyles.statCard} style={{ 
                                                    background: style.bg,
                                                    border: `2px solid ${style.text}20`
                                                }}>
                                                    <div className={layoutStyles.statContent}>
                                                        <h3 style={{ color: style.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '24px' }}>{style.icon}</span>
                                                            {classData.year}
                                                        </h3>
                                                        <div className={layoutStyles.statValue} style={{ color: style.text }}>
                                                            {classData.count}
                                                        </div>
                                                        <p className={layoutStyles.statSubtext} style={{ color: style.text }}>
                                                            {((classData.count / dashboardStats.totalStudents) * 100).toFixed(1)}% of total students
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Class-Wise Student Distribution Chart */}
                            <div className={layoutStyles.sectionCard} style={{ marginBottom: '30px' }}>
                                <div className={layoutStyles.sectionHeader}>
                                    <h2>Visual Distribution Graph</h2>
                                    <p>Student enrollment by diploma year</p>
                                </div>
                                <div className={layoutStyles.sectionBody}>
                                    <ClassWiseChart data={dashboardStats.classWiseStats} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Branch Fees Bar Chart */}
                    {dashboardStats?.branchStats && dashboardStats.branchStats.length > 0 && (
                        <div className={layoutStyles.sectionCard}>
                            <div className={layoutStyles.sectionHeader}>
                                <h2>Total Fees by Branch</h2>
                                <p>Visual representation of fees collected across all branches</p>
                            </div>
                            <div className={layoutStyles.sectionBody}>
                                <BranchFeesChart data={dashboardStats.branchStats} />
                            </div>
                        </div>
                    )}
                </AdminLayout>
            )
    }

    if (isHeadAdmin) {
        if (!headStats) return null
        const headerActions = (
            <button onClick={handleLogout} className={layoutStyles.logoutButton}>
                Logout
            </button>
        )

        const totalAdmissions = headStats.reduce((sum, branch) => sum + branch.totalAdmissions, 0)
        const totalPendingFees = headStats.reduce((sum, branch) => sum + branch.pendingFees, 0)
        const totalExpenses = headStats.reduce((sum, branch) => sum + branch.pendingExpenses, 0)

        return (
            <AdminLayout 
                title="Head Admin Dashboard"
                headerActions={headerActions}
            >
                {/* Aggregate Stats */}
                <div className={layoutStyles.statsGrid} style={{ marginBottom: '30px' }}>
                    <div className={`${layoutStyles.statCard} ${layoutStyles.primary}`}>
                        <div className={layoutStyles.statContent}>
                            <h3>Total Admissions</h3>
                            <div className={layoutStyles.statValue}>{totalAdmissions}</div>
                            <p className={layoutStyles.statSubtext}>Across all branches</p>
                        </div>
                    </div>
                    <div className={`${layoutStyles.statCard} ${layoutStyles.warning}`}>
                        <div className={layoutStyles.statContent}>
                            <h3>Total Pending Fees</h3>
                            <div className={layoutStyles.statValue}>₹{totalPendingFees.toLocaleString()}</div>
                            <p className={layoutStyles.statSubtext}>Outstanding payments</p>
                        </div>
                    </div>
                    <div className={`${layoutStyles.statCard} ${layoutStyles.danger}`}>
                        <div className={layoutStyles.statContent}>
                            <h3>Total Expenses</h3>
                            <div className={layoutStyles.statValue}>₹{totalExpenses.toLocaleString()}</div>
                            <p className={layoutStyles.statSubtext}>Branch expenses</p>
                        </div>
                    </div>
                </div>

                {/* Branch Wise Analytics */}
                <div className={layoutStyles.sectionCard}>
                    <div className={layoutStyles.sectionHeader}>
                        <h2>Branch Wise Analytics</h2>
                        <p>Detailed breakdown of all branches performance and metrics</p>
                    </div>
                    <div className={layoutStyles.sectionBody}>
                        <div className={layoutStyles.statsGrid}>
                            {headStats.map((branch) => (
                                <div key={branch.id} className={layoutStyles.statCard}>
                                    <div className={layoutStyles.statContent}>
                                        <h3 style={{ color: '#c12727', marginBottom: '12px', fontSize: '16px' }}>{branch.name}</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#6b7280', fontSize: '14px' }}>Admissions:</span>
                                                <strong style={{ fontSize: '18px', color: '#111827' }}>{branch.totalAdmissions}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#6b7280', fontSize: '14px' }}>Pending Fees:</span>
                                                <strong style={{ color: '#f59e0b', fontSize: '18px' }}>₹{branch.pendingFees.toLocaleString()}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#6b7280', fontSize: '14px' }}>Expenses:</span>
                                                <strong style={{ color: '#ef4444', fontSize: '18px' }}>₹{branch.pendingExpenses.toLocaleString()}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </AdminLayout>
        )
    }

    // Legacy admin view (kept for backward compatibility with old admin logins)
    if (!stats) return null

    const headerActions = (
        <button onClick={handleLogout} className={layoutStyles.logoutButton}>
            Logout
        </button>
    )

    return (
        <AdminLayout 
            title="Admin Dashboard"
            headerActions={headerActions}
        >
            {/* Statistics Cards */}
            <div className={layoutStyles.statsGrid} style={{ marginBottom: '30px' }}>
                <div className={`${layoutStyles.statCard} ${layoutStyles.primary}`}>
                    <div className={layoutStyles.statContent}>
                        <h3>Total Students</h3>
                        <div className={layoutStyles.statValue}>{stats.totalStudents}</div>
                        <p className={layoutStyles.statSubtext}>Registered students</p>
                    </div>
                </div>
                <div className={`${layoutStyles.statCard} ${layoutStyles.success}`}>
                    <div className={layoutStyles.statContent}>
                        <h3>Today's Classes</h3>
                        <div className={layoutStyles.statValue}>{stats.todaysClasses}</div>
                        <p className={layoutStyles.statSubtext}>Scheduled today</p>
                    </div>
                </div>
                <div className={`${layoutStyles.statCard} ${layoutStyles.warning}`}>
                    <div className={layoutStyles.statContent}>
                        <h3>Fee Pending</h3>
                        <div className={layoutStyles.statValue}>{stats.feePendingStudents}</div>
                        <p className={layoutStyles.statSubtext}>Pending payments</p>
                    </div>
                </div>
                <div className={`${layoutStyles.statCard} ${layoutStyles.info}`}>
                    <div className={layoutStyles.statContent}>
                        <h3>New Admissions</h3>
                        <div className={layoutStyles.statValue}>{stats.newAdmissions}</div>
                        <p className={layoutStyles.statSubtext}>Recent enrollments</p>
                    </div>
                </div>
                <div className={`${layoutStyles.statCard} ${layoutStyles.primary}`}>
                    <div className={layoutStyles.statContent}>
                        <h3>Upcoming Events</h3>
                        <div className={layoutStyles.statValue}>{stats.upcomingEvents}</div>
                        <p className={layoutStyles.statSubtext}>Scheduled events</p>
                    </div>
                </div>
                <div className={`${layoutStyles.statCard} ${layoutStyles.success}`}>
                    <div className={layoutStyles.statContent}>
                        <h3>Teachers / Gurus</h3>
                        <div className={layoutStyles.statValue}>{stats.teachersCount}</div>
                        <p className={layoutStyles.statSubtext}>Active instructors</p>
                    </div>
                </div>
            </div>

            {/* Active Courses */}
            {stats.activeCourses && stats.activeCourses.length > 0 && (
                <div className={layoutStyles.sectionCard} style={{ marginBottom: '30px' }}>
                    <div className={layoutStyles.sectionHeader}>
                        <h2>Active Courses</h2>
                        <p>Currently offered music courses</p>
                    </div>
                    <div className={layoutStyles.sectionBody}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {stats.activeCourses.map((course, index) => (
                                <span 
                                    key={index}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#f3f4f6',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        color: '#374151',
                                        fontWeight: '500'
                                    }}
                                >
                                    {course}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Musical Courses Analytics */}
            <div className={layoutStyles.sectionCard}>
                <div className={layoutStyles.sectionHeader}>
                    <h2>Musical Courses Analytics</h2>
                    <p>Student progress and course performance overview</p>
                </div>
                <div className={layoutStyles.sectionBody}>
                    <div className={layoutStyles.tableWrapper}>
                        <table className={layoutStyles.dataTable}>
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Course</th>
                                    <th>Progress</th>
                                    <th>Status</th>
                                    <th>Last Active</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.map((student) => (
                                    <tr key={student.id}>
                                        <td style={{ fontWeight: '600' }}>{student.name}</td>
                                        <td>{student.course}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ 
                                                    flex: 1, 
                                                    height: '8px', 
                                                    background: '#e5e7eb', 
                                                    borderRadius: '4px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${student.progress}%`,
                                                        background: '#3b82f6',
                                                        borderRadius: '4px',
                                                        transition: 'width 0.3s'
                                                    }}></div>
                                                </div>
                                                <span style={{ fontSize: '13px', color: '#6b7280', minWidth: '40px' }}>
                                                    {student.progress}%
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${layoutStyles.statusBadge} ${layoutStyles[student.status.toLowerCase()]}`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td>{student.lastActive}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
