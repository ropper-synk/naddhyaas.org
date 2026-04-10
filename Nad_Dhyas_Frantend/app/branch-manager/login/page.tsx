'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './Login.module.css'

export default function BranchManagerLogin() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/branch-manager/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json()

            if (data.success && data.manager) {
                // Store manager info in localStorage
                localStorage.setItem('branchManager', JSON.stringify(data.manager))
                localStorage.setItem('branchManagerId', data.manager.id.toString())
                localStorage.setItem('branchManagerBranch', data.manager.branch)
                localStorage.setItem('branchManagerName', data.manager.name)
                
                // Redirect to branch manager dashboard
                router.push('/branch-manager/dashboard')
            } else {
                setError(data.error || 'Invalid email or password')
            }
        } catch (error) {
            console.error('Login error:', error)
            setError('An error occurred during login. Please try again.')
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

            {/* Main Content - Split Layout */}
            <div className={styles.contentWrapper}>
                {/* Left Side - Login Form */}
                <div className={styles.loginSection}>
                    <div className={styles.loginCard}>
                        <div className={styles.logoSection}>
                            <img src="/Logo.png" alt="Logo" className={styles.logo} />
                        </div>
                        
                        <div className={styles.header}>
                            <h1 className={styles.title}>Branch Manager Login</h1>
                            <p className={styles.subtitle}>Welcome back! Please login to your account</p>
                        </div>

                        {error && (
                            <div className={styles.errorMessage}>
                                <span className={styles.errorIcon}>⚠️</span>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="email" className={styles.label}>
                                    Email Address
                                </label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={styles.input}
                                        placeholder="Enter your email"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label htmlFor="password" className={styles.label}>
                                    Password
                                </label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="password"
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={styles.input}
                                        placeholder="Enter your password"
                                        required
                                        disabled={loading}
                                    />
                                </div>
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
                                Need help? <a href="#" className={styles.helpLink}>Contact Administrator</a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Image */}
                <div className={styles.imageSection}>
                    <div className={styles.imageContainer}>
                        <img 
                            src="/admission-side.png" 
                            alt="Branch Manager Login" 
                            className={styles.backgroundImage}
                            onError={(e) => {
                                // Fallback to Background.jpg if admission-side.png doesn't exist
                                e.currentTarget.src = '/Background.jpg'
                            }}
                        />
                        <div className={styles.imageOverlay}>
                            <div className={styles.overlayContent}>
                                <h2 className={styles.overlayTitle}>Naad Dhyas</h2>
                                <p className={styles.overlaySubtitle}>Branch Management System</p>
                                <div className={styles.decorativeDivider}></div>
                                <p className={styles.overlayDescription}>
                                    Manage your branch operations, students, and reports efficiently
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
