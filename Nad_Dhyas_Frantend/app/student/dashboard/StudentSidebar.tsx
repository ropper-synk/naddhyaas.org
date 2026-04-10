'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import styles from './StudentSidebar.module.css'

export default function StudentSidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [examFormEnabled, setExamFormEnabled] = useState(false)
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        const fetchExamFormEnabled = async () => {
            try {
                const res = await fetch('/api/examination', { cache: 'no-store' })
                const data = await res.json()
                if (data.success && data.formEnabled) {
                    setExamFormEnabled(true)
                }
            } catch {
                setExamFormEnabled(false)
            }
        }
        fetchExamFormEnabled()
    }, [])

    const handleLogout = () => {
        sessionStorage.clear()
        router.push('/')
    }

    const baseMenuItems = [
        {
            name: 'Dashboard',
            icon: '◉',
            path: '/student/dashboard',
        },
        {
            name: 'Profile',
            icon: '☰',
            path: '/student/profile',
        },
        {
            name: 'Admission Form',
            icon: '📋',
            path: '/student/admission-form',
        },
    ]

    const examFormItem = {
        name: 'Exam Form',
        icon: '📝',
        path: '/student/exam-form',
    }

    const invoicesItem = {
        name: 'Invoices',
        icon: '⎙',
        path: '/student/invoices',
    }

    const menuItems = examFormEnabled
        ? [...baseMenuItems, examFormItem, invoicesItem]
        : [...baseMenuItems, invoicesItem]

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.sidebarHeader}>
                <div className={styles.logo}>
                    <img src="/Logo.png" alt="Logo" className={styles.logoImage} />
                    {!isCollapsed && <span className={styles.logoText}>Student Portal</span>}
                </div>
                <button 
                    className={styles.toggleButton}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? '→' : '←'}
                </button>
            </div>

            <nav className={styles.nav}>
                {menuItems.map((item) => {
                    const isActive = pathname === item.path

                    return (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            title={isCollapsed ? item.name : ''}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            {!isCollapsed && <span className={styles.navText}>{item.name}</span>}
                        </Link>
                    )
                })}
            </nav>

            <div className={styles.sidebarFooter}>
                <button 
                    className={styles.logoutButton}
                    onClick={handleLogout}
                    title={isCollapsed ? 'Logout' : ''}
                >
                    <span className={styles.navIcon}>↪</span>
                    {!isCollapsed && <span className={styles.navText}>Logout</span>}
                </button>
            </div>
        </aside>
    )
}
