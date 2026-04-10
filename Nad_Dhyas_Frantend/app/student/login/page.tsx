'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './StudentLogin.module.css'

export default function StudentLoginPage() {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        
        // Validate inputs
        if (!name.trim()) {
            setError('Please enter your full name')
            return
        }
        
        if (!phone.trim() || phone.length !== 10) {
            setError('Please enter a valid 10-digit contact number')
            return
        }
        
        setLoading(true)

        try {
            const res = await fetch('/api/student/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    phone: phone.trim()
                })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                // Store student info
                sessionStorage.setItem('studentId', data.studentId.toString())
                sessionStorage.setItem('studentName', data.fullName)
                sessionStorage.setItem('studentPhone', data.phone)
                
                // Redirect to dashboard
                router.push('/student/dashboard')
            } else {
                setError(data.error || 'Invalid credentials. Please check your name and contact number.')
            }
        } catch (error) {
            console.error('Login error:', error)
            setError('An error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            {/* Back Button */}
            <Link href="/" className={styles.backButton}>
                <span className={styles.backIcon}>←</span>
                <span>Back to Home</span>
            </Link>

            {/* Main Content */}
            <div className={styles.contentWrapper}>
                {/* Left Side - Login Form */}
                <div className={styles.loginSection}>
                    <div className={styles.loginCard}>
                        <div className={styles.logoSection}>
                            <img src="/Logo.png" alt="Logo" className={styles.logo} />
                        </div>
                        
                        <div className={styles.header}>
                            <h1 className={styles.title}>Student Login</h1>
                            <p className={styles.subtitle}>Enter your name and contact number</p>
                        </div>

                        {error && (
                            <div className={styles.errorMessage}>
                                <span className={styles.errorIcon}>⚠️</span>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="name" className={styles.label}>
                                    Full Name
                                </label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        id="name"
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={styles.input}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <small className={styles.hint}>Enter your name as registered</small>
                            </div>

                            <div className={styles.inputGroup}>
                                <label htmlFor="phone" className={styles.label}>
                                    Contact Number
                                </label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        id="phone"
                                        type="tel"
                                        placeholder="Enter 10-digit number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        className={styles.input}
                                        required
                                        maxLength={10}
                                        disabled={loading}
                                    />
                                </div>
                                <small className={styles.hint}>Enter your registered contact number</small>
                            </div>

                            <button 
                                type="submit" 
                                className={styles.loginButton}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className={styles.buttonContent}>
                                        <span className={styles.spinner}></span>
                                        Logging in...
                                    </span>
                                ) : (
                                    <span className={styles.buttonContent}>
                                        Login
                                        <span className={styles.arrowIcon}>→</span>
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className={styles.footer}>
                            <p className={styles.footerText}>
                                Don't have an account?{' '}
                                <Link href="/register" className={styles.registerLink}>
                                    Register here
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Image */}
                <div className={styles.imageSection}>
                    <div className={styles.imageContainer}>
                        <img 
                            src="/admission-side.png" 
                            alt="Student Login" 
                            className={styles.backgroundImage}
                            onError={(e) => {
                                e.currentTarget.src = '/Background.jpg'
                            }}
                        />
                        <div className={styles.imageOverlay}>
                            <div className={styles.overlayContent}>
                                <h2 className={styles.overlayTitle}>Student Portal</h2>
                                <p className={styles.overlaySubtitle}>Access Your Learning Journey</p>
                                <div className={styles.decorativeDivider}></div>
                                <p className={styles.overlayDescription}>
                                    Login with your registered name and contact number
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
