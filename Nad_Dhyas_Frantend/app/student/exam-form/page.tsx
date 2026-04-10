'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './ExamForm.module.css'
import layoutStyles from '../dashboard/StudentLayout.module.css'

const EXAM_FEE_AMOUNT = 200

interface ExamRegistration {
    id: number
    examFormNo: string | null
    fullName: string
    photo: string | null
    phone: string
    email: string
    branch: string | null
    diplomaYear: string | null
    instrumentalSubject: string | null
    vocalSubject: string | null
    danceSubject: string | null
    examFeeAmount: number | null
    transactionId: string | null
    createdAt: string | null
}

const TERMS_TEXT = [
    'The applicant must meet the eligibility criteria prescribed by the institution/university.',
    'The candidate must have completed the required attendance and academic requirements.',
    'Any false eligibility claim may result in cancellation of candidature. The candidate must provide accurate and complete information while filling the form. Incomplete or unclear documents may lead to rejection of the form.',
    'Fees once paid are non-refundable and non-transferable except in special cases approved by the institution. The candidate must submit the form before the last date.',
    'The institution is not responsible for technical issues, server errors, or internet problems at the candidate\'s end. The institution reserves the right to cancel or reject any application found to contain false information.',
    'Violation of rules may result in disqualification.',
]

export default function StudentExamFormPage() {
    const router = useRouter()
    const [formEnabled, setFormEnabled] = useState<boolean | null>(null)
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({
        fullName: '',
        photo: '',
        phone: '',
        email: '',
        branch: '',
        diplomaYear: '',
        instrumentalSubject: '',
        vocalSubject: '',
        danceSubject: '',
        transactionId: '',
        termsAgreed: false,
    })
    const [submitting, setSubmitting] = useState(false)
    const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)
    const [registrationData, setRegistrationData] = useState<ExamRegistration | null>(null)
    const [registrationLoading, setRegistrationLoading] = useState(false)

    useEffect(() => {
        const studentId = sessionStorage.getItem('studentId')
        if (!studentId) {
            router.push('/student/login')
            return
        }

        const fetchData = async () => {
            try {
                const [examRes, studentRes] = await Promise.all([
                    fetch(`/api/examination?studentId=${encodeURIComponent(studentId)}`, { cache: 'no-store' }),
                    fetch(`/api/student/${studentId}`, { cache: 'no-store' }),
                ])
                const examData = await examRes.json()
                const studentData = await studentRes.json()

                if (examData.success) {
                    setFormEnabled(Boolean(examData.formEnabled))
                    setAlreadySubmitted(Boolean(examData.alreadySubmitted))
                } else {
                    setFormEnabled(false)
                }

                if (studentRes.ok && studentData.fullName) {
                    const phone = studentData.phone
                    const phoneStr = Array.isArray(phone) ? phone.join('') : (phone || '')
                    setFormData((prev) => ({
                        ...prev,
                        fullName: studentData.fullName || prev.fullName,
                        email: studentData.email || prev.email,
                        phone: phoneStr || prev.phone,
                        branch: studentData.branch || prev.branch,
                    }))
                }
            } catch {
                setFormEnabled(false)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [router])

    useEffect(() => {
        if (!alreadySubmitted) return
        const studentId = sessionStorage.getItem('studentId')
        if (!studentId) return
        const fetchRegistration = async () => {
            setRegistrationLoading(true)
            try {
                const res = await fetch(`/api/examination/registration?studentId=${encodeURIComponent(studentId)}`, { cache: 'no-store' })
                const data = await res.json()
                if (data.success && data.registration) {
                    setRegistrationData(data.registration)
                }
            } catch {
                setRegistrationData(null)
            } finally {
                setRegistrationLoading(false)
            }
        }
        fetchRegistration()
    }, [alreadySubmitted])

    const generateExamFormPDF = (reg: ExamRegistration) => {
        const printWindow = window.open('', '_blank')
        if (!printWindow) return
        const musicPreference = reg.instrumentalSubject || reg.vocalSubject || reg.danceSubject || 'Not selected'
        const submittedDate = reg.createdAt ? new Date(reg.createdAt).toLocaleString('en-IN') : 'N/A'
        const formNoDisplay = reg.examFormNo ? reg.examFormNo : 'N/A'
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Exam Registration Form - ${reg.fullName}</title>
                <style>
                    @media print { @page { margin: 8mm; size: A4; } body { margin: 0; padding: 0; } .no-print { display: none; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                    body { font-family: Arial, sans-serif; padding: 8px; color: #000; background: white; font-size: 10px; line-height: 1.2; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #8b0000; padding-bottom: 8px; margin-bottom: 10px; }
                    .header-left h1 { color: #8b0000; margin: 0 0 2px 0; font-size: 16px; font-weight: bold; }
                    .header-left p { margin: 1px 0; font-size: 9px; color: #333; }
                    .header-right h2 { color: #8b0000; margin: 0; font-size: 16px; font-weight: bold; }
                    .header-right p { margin: 3px 0 0 0; font-size: 9px; color: #333; }
                    .form-section { margin-bottom: 8px; page-break-inside: avoid; }
                    .form-section h3 { color: #8b0000; border-bottom: 1.5px solid #8b0000; padding-bottom: 3px; margin-bottom: 6px; font-size: 11px; font-weight: bold; }
                    .info-table { width: 100%; border-collapse: collapse; font-size: 9px; }
                    .info-table td { padding: 4px 6px; border: 1px solid #ddd; line-height: 1.2; }
                    .info-table td:first-child { width: 28%; font-weight: bold; }
                    .photo-top { text-align: center; margin-bottom: 10px; }
                    .photo-box { width: 90px; height: 110px; border: 1.5px solid #333; display: inline-flex; align-items: center; justify-content: center; background: #f9f9f9; }
                    .photo-box img { max-width: 100%; max-height: 100%; object-fit: cover; }
                    .photo-placeholder { text-align: center; color: #666; font-size: 8px; padding: 5px; }
                    .signature-row { margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 10px; }
                    .signature-row .sig-cell { width: 28%; }
                    .signature-row .sig-cell.left { text-align: left; }
                    .signature-row .sig-cell.center { text-align: center; }
                    .signature-row .sig-cell.right { text-align: right; }
                    .signature-row .sig-line { border-bottom: 1px solid #333; height: 36px; margin-bottom: 4px; }
                    .signature-row .sig-label { font-size: 9px; color: #333; font-weight: bold; }
                    .footer { margin-top: 10px; text-align: center; font-size: 8px; color: #666; border-top: 1px solid #ddd; padding-top: 5px; }
                    .no-print { text-align: center; margin-top: 20px; }
                    .no-print button { padding: 10px 20px; background: #8b0000; color: white; border: none; border-radius: 5px; font-size: 14px; cursor: pointer; margin: 0 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-left">
                        <h1>Swargumphan Sangeet Vidyalaya</h1>
                        <p>run by Naad dhyas Foundation</p>
                    </div>
                    <div class="header-right">
                        <h2>Exam Registration Form</h2>
                        <p><strong>Exam Form ID:</strong> ${formNoDisplay}</p>
                        <p>Submitted on: ${submittedDate}</p>
                    </div>
                </div>
                <div class="photo-top">
                    <div class="photo-box">${reg.photo ? `<img src="${reg.photo}" alt="Photo" />` : '<span class="photo-placeholder">PHOTO</span>'}</div>
                    <div style="font-size: 9px; color: #666; margin-top: 4px;">Photo (as submitted)</div>
                </div>
                <div class="form-section">
                    <h3>Personal &amp; Registration Details</h3>
                    <table class="info-table">
                        <tr><td>Exam Form ID</td><td>${formNoDisplay}</td></tr>
                        <tr><td>Full Name</td><td>${reg.fullName || 'N/A'}</td></tr>
                        <tr><td>Contact No</td><td>${reg.phone || 'N/A'}</td></tr>
                        <tr><td>Email</td><td>${reg.email || 'N/A'}</td></tr>
                        <tr><td>Branch</td><td>${reg.branch || 'N/A'}</td></tr>
                        <tr><td>Diploma Year</td><td>${reg.diplomaYear || 'N/A'}</td></tr>
                        <tr><td>Music Preference</td><td>${musicPreference}</td></tr>
                        <tr><td>Exam Fee Amount</td><td>${reg.examFeeAmount != null ? '₹' + reg.examFeeAmount : 'N/A'}</td></tr>
                        <tr><td>Transaction ID / UPI</td><td>${reg.transactionId || 'N/A'}</td></tr>
                    </table>
                </div>
                <div class="signature-row">
                    <div class="sig-cell left">
                        <div class="sig-line"></div>
                        <div class="sig-label">Student Sign</div>
                    </div>
                    <div class="sig-cell center">
                        <div class="sig-line"></div>
                        <div class="sig-label">Seal</div>
                    </div>
                    <div class="sig-cell right">
                        <div class="sig-line"></div>
                        <div class="sig-label">Sign of Branch Head</div>
                    </div>
                </div>
                <div class="footer">
                    <p>This is a computer generated exam registration form.</p>
                    <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
                </div>
                <div class="no-print">
                    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
                    <button onclick="window.close()">Close</button>
                </div>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        const checked = (e.target as HTMLInputElement).checked
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'termsAgreed' ? checked : value,
        }))
        setSubmitResult(null)
    }

    const handleMusicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            instrumentalSubject: name === 'instrumentalSubject' ? value : '',
            vocalSubject: name === 'vocalSubject' ? value : '',
            danceSubject: name === 'danceSubject' ? value : '',
            [name]: value,
        }))
        setSubmitResult(null)
    }

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
            alert('Please upload a photo in PNG, JPG, or JPEG format only.')
            e.target.value = ''
            return
        }
        if (file.size > 256 * 1024) {
            alert('Maximum file size is 256 KB.')
            e.target.value = ''
            return
        }
        const reader = new FileReader()
        reader.onloadend = () => {
            setFormData((prev) => ({ ...prev, photo: reader.result as string }))
        }
        reader.onerror = () => {
            alert('Error reading the photo. Please try again.')
            e.target.value = ''
        }
        reader.readAsDataURL(file)
        setSubmitResult(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.termsAgreed) {
            setSubmitResult({ success: false, message: 'Please agree to the Terms & Conditions.' })
            return
        }
        if (!formData.fullName?.trim()) {
            setSubmitResult({ success: false, message: 'Full name is required.' })
            return
        }
        if (!formData.phone?.trim()) {
            setSubmitResult({ success: false, message: 'Contact number is required.' })
            return
        }
        if (!formData.email?.trim()) {
            setSubmitResult({ success: false, message: 'Email address is required.' })
            return
        }
        if (!formData.transactionId?.trim()) {
            setSubmitResult({ success: false, message: 'Please enter UPI ID / Transaction ID for exam fee.' })
            return
        }
        if (!formData.branch?.trim()) {
            setSubmitResult({ success: false, message: 'Please select Branch.' })
            return
        }
        if (!formData.diplomaYear?.trim()) {
            setSubmitResult({ success: false, message: 'Please select Diploma Year.' })
            return
        }
        const hasMusicPreference = !!(formData.instrumentalSubject || formData.vocalSubject || formData.danceSubject)
        if (!hasMusicPreference) {
            setSubmitResult({ success: false, message: 'Please select a Music Preference (Instrumental, Vocal, or Dance).' })
            return
        }
        setSubmitting(true)
        setSubmitResult(null)
        const studentId = sessionStorage.getItem('studentId')
        try {
            const res = await fetch('/api/examination', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admissionId: studentId || undefined,
                    fullName: formData.fullName.trim(),
                    photo: formData.photo || undefined,
                    phone: formData.phone.trim(),
                    email: formData.email.trim(),
                    branch: formData.branch || undefined,
                    diplomaYear: formData.diplomaYear || undefined,
                    instrumentalSubject: formData.instrumentalSubject || undefined,
                    vocalSubject: formData.vocalSubject || undefined,
                    danceSubject: formData.danceSubject || undefined,
                    examFeeAmount: EXAM_FEE_AMOUNT,
                    transactionId: formData.transactionId.trim(),
                }),
            })
            const result = await res.json()
            if (result.success) {
                setRegistrationData({
                    id: 0,
                    examFormNo: result.examFormNo || null,
                    fullName: formData.fullName.trim(),
                    photo: formData.photo || null,
                    phone: formData.phone.trim(),
                    email: formData.email.trim(),
                    branch: formData.branch || null,
                    diplomaYear: formData.diplomaYear || null,
                    instrumentalSubject: formData.instrumentalSubject || null,
                    vocalSubject: formData.vocalSubject || null,
                    danceSubject: formData.danceSubject || null,
                    examFeeAmount: EXAM_FEE_AMOUNT,
                    transactionId: formData.transactionId.trim() || null,
                    createdAt: new Date().toISOString(),
                })
                setAlreadySubmitted(true)
                setSubmitResult({ success: true, message: 'Exam form submitted successfully.' })
                setFormData((prev) => ({
                    ...prev,
                    transactionId: '',
                    termsAgreed: false,
                }))
            } else {
                setSubmitResult({ success: false, message: result.error || 'Submission failed.' })
            }
        } catch (err: any) {
            setSubmitResult({ success: false, message: err?.message || 'Submission failed.' })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p className={styles.loadingText}>Loading...</p>
            </div>
        )
    }

    if (formEnabled === false) {
        return (
            <div className={styles.unavailableContainer}>
                <h1 className={layoutStyles.headerTitle}>Exam Form</h1>
                <div className={styles.unavailableCard}>
                    <p className={styles.unavailableText}>Exam registration form is currently not available.</p>
                    <p className={styles.unavailableSubtext}>When the admin enables it, you will see &quot;Exam Form&quot; in the sidebar and can submit from here.</p>
                    <Link href="/student/dashboard" className={styles.dashboardLink}>Back to Dashboard</Link>
                </div>
            </div>
        )
    }

    if (alreadySubmitted) {
        return (
            <>
                <header className={layoutStyles.header}>
                    <div className={layoutStyles.headerLeft}>
                        <h1 className={layoutStyles.headerTitle}>Exam Form</h1>
                    </div>
                </header>
                <main className={layoutStyles.contentArea}>
                    <div className={styles.alreadyFilledWrapper}>
                        <div className={styles.alreadyFilledCard}>
                            <div className={styles.alreadyFilledIcon}>✓</div>
                            <h2 className={styles.alreadyFilledTitle}>You have filled the Exam form</h2>
                            <p className={styles.alreadyFilledText}>You have already submitted the exam registration form. Each student can submit only once.</p>
                            {registrationData?.examFormNo && (
                                <p className={styles.examFormNo}>Exam Form ID: <strong>{registrationData.examFormNo}</strong></p>
                            )}
                            <div className={styles.alreadyFilledActions}>
                                <button
                                    type="button"
                                    className={styles.downloadPdfBtn}
                                    onClick={() => registrationData && generateExamFormPDF(registrationData)}
                                    disabled={registrationLoading || !registrationData}
                                >
                                    {registrationLoading ? 'Loading...' : '📄 Download Exam Form (PDF)'}
                                </button>
                                <Link href="/student/dashboard" className={styles.dashboardLink}>Back to Dashboard</Link>
                            </div>
                        </div>
                    </div>
                </main>
            </>
        )
    }

    return (
        <>
            <header className={layoutStyles.header}>
                <div className={layoutStyles.headerLeft}>
                    <h1 className={layoutStyles.headerTitle}>Exam Registration Form</h1>
                </div>
            </header>
            <main className={layoutStyles.contentArea}>
                <div className={styles.formPageWrapper}>
                <div className={styles.formCard}>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.field}>
                            <label htmlFor="fullName">Full Name <span className={styles.required}>*</span></label>
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                placeholder="Your full name"
                            />
                        </div>

                        <div className={styles.field}>
                            <label>Photo Upload</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                onChange={handlePhotoChange}
                                className={styles.fileInput}
                            />
                            <p className={styles.photoHint}>PNG, JPG or JPEG. Max 256 KB.</p>
                            {formData.photo && (
                                <div className={styles.photoPreview}>
                                    <img src={formData.photo} alt="Preview" />
                                    <span>Photo uploaded</span>
                                </div>
                            )}
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="phone">Contact No <span className={styles.required}>*</span></label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                placeholder="10-digit mobile number"
                                maxLength={10}
                            />
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="email">Email Address <span className={styles.required}>*</span></label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="your@email.com"
                            />
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="branch">Branch <span className={styles.required}>*</span></label>
                            <select
                                id="branch"
                                name="branch"
                                value={formData.branch}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Branch</option>
                                <option value="Karmaveer Nagar Society">Karmaveer Nagar</option>
                                <option value="Godoli, Satara">Godoli, Satara</option>
                                <option value="Krantismruti, Satara">Krantismruti, Satara</option>
                                <option value="Karad">Karad</option>
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="diplomaYear">Diploma Year <span className={styles.required}>*</span></label>
                            <select
                                id="diplomaYear"
                                name="diplomaYear"
                                value={formData.diplomaYear}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Year</option>
                                <option value="First Year">First Year</option>
                                <option value="Second Year">Second Year</option>
                                <option value="Third Year">Third Year</option>
                            </select>
                        </div>

                        <div className={styles.sectionTitle}>Music Preference <span className={styles.required}>*</span></div>
                        <p className={styles.sectionHint}>Select one: Instrumental, Vocal, or Dance (same as Admission Form).</p>
                        <div className={styles.musicGrid}>
                            <div className={styles.musicCategory}>
                                <label>Instrumental</label>
                                <select
                                    name="instrumentalSubject"
                                    value={formData.instrumentalSubject}
                                    onChange={handleMusicChange}
                                    disabled={!!(formData.vocalSubject || formData.danceSubject)}
                                >
                                    <option value="">Select Instrument</option>
                                    <option value="Tabla">Tabla</option>
                                    <option value="Harmonium">Harmonium</option>
                                    <option value="Satar">Satar</option>
                                    <option value="Bansuri">Bansuri</option>
                                    <option value="Guitar">Guitar</option>
                                    <option value="Pakhawaj">Pakhawaj</option>
                                </select>
                            </div>
                            <div className={styles.musicCategory}>
                                <label>Indian classical vocal</label>
                                <select
                                    name="vocalSubject"
                                    value={formData.vocalSubject}
                                    onChange={handleMusicChange}
                                    disabled={!!(formData.instrumentalSubject || formData.danceSubject)}
                                >
                                    <option value="">Select Vocal Style</option>
                                    <option value="Hindustani Classical Vocal">Hindustani Classical Vocal</option>
                                    <option value="Maharashtrian Bhajan">Maharashtrian Bhajan</option>
                                    <option value="Light Music">Light Music</option>
                                </select>
                            </div>
                            <div className={styles.musicCategory}>
                                <label>Dance</label>
                                <select
                                    name="danceSubject"
                                    value={formData.danceSubject}
                                    onChange={handleMusicChange}
                                    disabled={!!(formData.instrumentalSubject || formData.vocalSubject)}
                                >
                                    <option value="">Select Dance Style</option>
                                    <option value="Bharatnatyam">Bharatnatyam</option>
                                    <option value="Kathak">Kathak</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.feeSection}>
                            <h3 className={styles.feeTitle}>Exam Form Fee</h3>
                            <div className={styles.amountDisplay}>Amount to Pay: ₹{EXAM_FEE_AMOUNT}</div>
                            <div className={styles.qrContainer}>
                                <img src="/UPI.png" alt="UPI QR Code" className={styles.qrImage} />
                                <div className={styles.upiId}>UPI ID: swargumphan@upi</div>
                                <p className={styles.qrHint}>Scan with PhonePe / GPay / Paytm</p>
                            </div>
                            <div className={styles.field}>
                                <label htmlFor="transactionId">UPI ID / Transaction ID <span className={styles.required}>*</span></label>
                                <input
                                    id="transactionId"
                                    name="transactionId"
                                    type="text"
                                    value={formData.transactionId}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter UPI ID or UTR Number"
                                />
                            </div>
                        </div>

                        <div className={styles.termsSection}>
                            <h3 className={styles.termsTitle}>Terms &amp; Conditions</h3>
                            <ul className={styles.termsList}>
                                {TERMS_TEXT.map((line, i) => (
                                    <li key={i}>{line}</li>
                                ))}
                            </ul>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="termsAgreed"
                                    checked={formData.termsAgreed}
                                    onChange={handleChange}
                                />
                                I have read and agree to the above Terms &amp; Conditions.
                            </label>
                        </div>

                        {submitResult && (
                            <p className={submitResult.success ? styles.successMsg : styles.errorMsg}>
                                {submitResult.message}
                            </p>
                        )}
                        <button type="submit" className={styles.submitBtn} disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Exam Form'}
                        </button>
                    </form>
                </div>
                </div>
            </main>
        </>
    )
}
