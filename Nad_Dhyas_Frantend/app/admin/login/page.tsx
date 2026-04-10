'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './AdminLogin.module.css'

export default function AdminLoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Try admin login via API (works for both ROOT and BRANCH admins)
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            })

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Server returned non-JSON response:', text.substring(0, 200));
                setError('Backend server error. Please check if the backend is running.');
                setLoading(false);
                return;
            }

            const result = await response.json()

            if (result.success && result.admin) {
                // Store admin info
                if (result.admin.role === 'ROOT') {
                    localStorage.setItem('isRootAdmin', 'true')
                    localStorage.setItem('adminRole', 'ROOT')
                    localStorage.setItem('adminId', result.admin.id.toString())
                    localStorage.setItem('adminUsername', result.admin.username)
                    localStorage.removeItem('adminBranch')
                } else {
                    localStorage.setItem('isBranchAdmin', 'true')
                    localStorage.setItem('adminRole', 'BRANCH')
                    localStorage.setItem('adminId', result.admin.id.toString())
                    localStorage.setItem('adminUsername', result.admin.username)
                    localStorage.setItem('adminBranch', result.admin.branch || '')
                }
                
                // Clear old admin session data
                localStorage.removeItem('isAdminLoggedIn')
                localStorage.removeItem('isHeadAdminLoggedIn')
                localStorage.removeItem('loggedInBranchId')
                
                router.push('/admin/dashboard')
            } else {
                setError(result.error || 'Invalid username or password')
            }
        } catch (err) {
            console.error('Login error:', err)
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
                            <h1 className={styles.title}>Admin Login</h1>
                            <p className={styles.subtitle}>Welcome back! Please login to your account</p>
                        </div>

                        {error && (
                            <div className={styles.errorMessage}>
                                <span className={styles.errorIcon}></span>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="username" className={styles.label}>
                                    Username
                                </label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className={styles.input}
                                        placeholder="Enter your username"
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
                                Need help? <a href="#" className={styles.helpLink}>Contact Support</a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Image */}
                <div className={styles.imageSection}>
                    <div className={styles.imageContainer}>
                        <img 
                            src="/admission-side.png" 
                            alt="Admin Login" 
                            className={styles.backgroundImage}
                            onError={(e) => {
                                // Fallback to Background.jpg if admission-side.png doesn't exist
                                e.currentTarget.src = '/Background.jpg'
                            }}
                        />
                        <div className={styles.imageOverlay}>
                            <div className={styles.overlayContent}>
                                <h2 className={styles.overlayTitle}>Naad Dhyas</h2>
                                <p className={styles.overlaySubtitle}>Music Department Management System</p>
                                <div className={styles.decorativeDivider}></div>
                                <p className={styles.overlayDescription}>
                                    Efficiently manage students, fees, expenses, and administrative tasks
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
