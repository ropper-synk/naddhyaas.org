'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './Profile.module.css'
import layoutStyles from '../dashboard/StudentLayout.module.css'

interface StudentData {
    admissionId: number
    fullName: string
    address: string
    phone: string
    email: string
    dateOfBirth: string
    age: number
    branch: string
    admissionDate: string
    formNo: string
    panCard: string
    aadharCard: string
    musicType: string
    instrumental: string
    vocal: string
    dance: string
    diplomaAdmissionYear: string
    joiningDate: string
    educationalActivities: string
    amountPaid: number
    totalFee: number
    remainingFee: number
    transactionId: string
    paymentType: string
    photo: string
}

export default function StudentProfile() {
    const [studentData, setStudentData] = useState<StudentData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const router = useRouter()

    useEffect(() => {
        const studentId = sessionStorage.getItem('studentId')
        if (!studentId) {
            router.push('/student/login')
            return
        }

        fetchStudentData(studentId)
    }, [router])

    const fetchStudentData = async (studentId: string) => {
        try {
            const res = await fetch(`/api/student/${studentId}`)
            const data = await res.json()

            if (res.ok) {
                setStudentData(data)
            } else {
                setError(data.error || 'Failed to fetch data')
            }
        } catch (error) {
            console.error('Error:', error)
            setError('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        sessionStorage.clear()
        router.push('/')
    }

    const downloadInvoice = () => {
        if (studentData) {
            window.open(`/invoice/${studentData.admissionId}`, '_blank')
        }
    }

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>Loading profile...</p>
            </div>
        )
    }

    if (error || !studentData) {
        return (
            <div className={styles.errorContainer}>
                <h2 className={styles.errorTitle}>Error</h2>
                <p className={styles.errorMessage}>{error || 'No data'}</p>
                <button onClick={handleLogout} className={styles.errorButton}>
                    Back to Login
                </button>
            </div>
        )
    }

    return (
        <>
            <header className={layoutStyles.header}>
                <div className={layoutStyles.headerLeft}>
                    <h1 className={layoutStyles.headerTitle}>My Profile</h1>
                </div>
            </header>
            <main className={layoutStyles.contentArea}>
            <div className={styles.profileGrid}>
                {/* Personal Info */}
                <div className={styles.profileCard}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Personal Information</h2>
                    </div>
                    <div className={styles.cardBody}>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Full Name:</span>
                                <span className={styles.value}>{studentData.fullName}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Email:</span>
                                <span className={styles.value}>{studentData.email || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Phone:</span>
                                <span className={styles.value}>{studentData.phone || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Date of Birth:</span>
                                <span className={styles.value}>
                                    {studentData.dateOfBirth 
                                        ? new Date(studentData.dateOfBirth).toLocaleDateString('en-IN')
                                        : 'N/A'}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Age:</span>
                                <span className={styles.value}>{studentData.age || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Address:</span>
                                <span className={styles.value}>{studentData.address || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>PAN Card:</span>
                                <span className={styles.value}>{studentData.panCard || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Aadhar Card:</span>
                                <span className={styles.value}>{studentData.aadharCard || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Academic Info */}
                <div className={styles.profileCard}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Academic Information</h2>
                    </div>
                    <div className={styles.cardBody}>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Form No:</span>
                                <span className={styles.value}>{studentData.formNo || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Branch:</span>
                                <span className={styles.value}>{studentData.branch || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Admission Date:</span>
                                <span className={styles.value}>
                                    {studentData.admissionDate 
                                        ? new Date(studentData.admissionDate).toLocaleDateString('en-IN')
                                        : 'N/A'}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Year:</span>
                                <span className={styles.value}>{studentData.diplomaAdmissionYear || 'First Year'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Joining Date:</span>
                                <span className={styles.value}>
                                    {studentData.joiningDate 
                                        ? new Date(studentData.joiningDate).toLocaleDateString('en-IN')
                                        : 'N/A'}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Educational/Job Details:</span>
                                <span className={styles.value}>{studentData.educationalActivities || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Course Info */}
                <div className={styles.profileCard}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Course Information</h2>
                    </div>
                    <div className={styles.cardBody}>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Course Type:</span>
                                <span className={styles.value}>{studentData.musicType || 'N/A'}</span>
                            </div>
                            {studentData.instrumental && (
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Instrumental:</span>
                                    <span className={styles.value}>{studentData.instrumental}</span>
                                </div>
                            )}
                            {studentData.vocal && (
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Vocal:</span>
                                    <span className={styles.value}>{studentData.vocal}</span>
                                </div>
                            )}
                            {studentData.dance && (
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Dance:</span>
                                    <span className={styles.value}>{studentData.dance}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Fee Info */}
                <div className={styles.profileCard}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Fee Information</h2>
                    </div>
                    <div className={styles.cardBody}>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Total Fee:</span>
                                <span className={`${styles.value} ${styles.highlight}`}>
                                    ₹{(studentData.totalFee || 10200).toLocaleString()}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Amount Paid:</span>
                                <span className={`${styles.value} ${styles.success}`}>
                                    ₹{(studentData.amountPaid || 0).toLocaleString()}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Remaining Fee:</span>
                                <span className={`${styles.value} ${styles.warning}`}>
                                    ₹{(studentData.remainingFee || studentData.totalFee || 10200).toLocaleString()}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Payment Type:</span>
                                <span className={styles.value}>{studentData.paymentType || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Transaction ID:</span>
                                <span className={styles.value}>{studentData.transactionId || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
                <button onClick={downloadInvoice} className={styles.downloadButton}>
                    Download Invoice
                </button>
                <Link href="/student/dashboard" className={styles.dashboardButton}>
                    Back to Dashboard
                </Link>
            </div>
            </main>
        </>
    )
}
