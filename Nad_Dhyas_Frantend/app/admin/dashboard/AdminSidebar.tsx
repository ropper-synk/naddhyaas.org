'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSidebar } from './SidebarContext'
import styles from './AdminSidebar.module.css'

export default function AdminSidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const { isCollapsed, setIsCollapsed } = useSidebar()
    const [isMenuOpen, setIsMenuOpen] = useState(!isCollapsed)
    const [role, setRole] = useState<'root' | 'branch' | 'head' | null>(null)

    useEffect(() => {
        const checkRole = () => {
            const adminRole = localStorage.getItem('adminRole')
            const isRootAdminLoggedIn = localStorage.getItem('isRootAdmin')
            const isHeadAdminLoggedIn = localStorage.getItem('isHeadAdminLoggedIn')
            const isBranchAdminLoggedIn = localStorage.getItem('isBranchAdmin')
            
            if (adminRole === 'ROOT' || isRootAdminLoggedIn === 'true') {
                setRole('root')
            } else if (isHeadAdminLoggedIn === 'true') {
                setRole('head')
            } else if (isBranchAdminLoggedIn === 'true') {
                setRole('branch')
            }
        }
        checkRole()
    }, [])

    useEffect(() => {
        setIsMenuOpen(!isCollapsed)
    }, [isCollapsed, setIsCollapsed])

    const handleToggle = () => {
        const newState = !isMenuOpen
        setIsMenuOpen(newState)
        setIsCollapsed(!newState)
    }

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

    // Removed unused menuItems array - navigation items are now hardcoded in JSX

    const isActive = (path: string) => pathname === path

    return (
        <div className={`${styles.sidebar} ${!isMenuOpen ? styles.collapsed : ''}`}>
            <div className={styles.sidebarHeader}>
                <div className={styles.logo}>
                    <img src="/Logo.png" alt="Logo" className={styles.logoIcon} />
                    <div className={styles.logoText}>
                        <h2>Swargumphan</h2>
                        <p>Music Institute</p>
                    </div>
                </div>
                <button 
                    className={styles.toggleBtn}
                    onClick={handleToggle}
                >
                    {isMenuOpen ? '◄' : '►'}
                </button>
            </div>

            <nav className={styles.nav}>
                <ul className={styles.navList}>
                    <li>
                        <a 
                            href="/admin/dashboard" 
                            className={`${styles.navItem} ${isActive('/admin/dashboard') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}></span>
                            {isMenuOpen && <span>Dashboard</span>}
                        </a>
                    </li>
                    {(role === 'root' || role === 'branch') && (
                        <li>
                            <a 
                                href="/admin/students" 
                                className={`${styles.navItem} ${isActive('/admin/students') ? styles.active : ''}`}
                            >
                                <span className={styles.navIcon}></span>
                                {isMenuOpen && <span>Student Records</span>}
                            </a>
                        </li>
                    )}
                    {role === 'branch' && (
                        <li>
                            <a 
                                href="/admin/invoices" 
                                className={`${styles.navItem} ${isActive('/admin/invoices') ? styles.active : ''}`}
                            >
                                <span className={styles.navIcon}></span>
                                {isMenuOpen && <span>Invoices</span>}
                            </a>
                        </li>
                    )}
                    {role === 'root' && (
                        <>
                            <li>
                                <a 
                                    href="/admin/expenses" 
                                    className={`${styles.navItem} ${isActive('/admin/expenses') ? styles.active : ''}`}
                                >
                                    <span className={styles.navIcon}></span>
                                    {isMenuOpen && <span>Expenses</span>}
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="/admin/letterhead" 
                                    className={`${styles.navItem} ${isActive('/admin/letterhead') ? styles.active : ''}`}
                                >
                                    <span className={styles.navIcon}></span>
                                    {isMenuOpen && <span>Letterhead</span>}
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="/admin/branch-managers" 
                                    className={`${styles.navItem} ${isActive('/admin/branch-managers') ? styles.active : ''}`}
                                >
                                    <span className={styles.navIcon}></span>
                                    {isMenuOpen && <span>Branch Managers</span>}
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="/admin/donation-records" 
                                    className={`${styles.navItem} ${isActive('/admin/donation-records') ? styles.active : ''}`}
                                >
                                    <span className={styles.navIcon}></span>
                                    {isMenuOpen && <span>Donation Records</span>}
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="/admin/performance-slider" 
                                    className={`${styles.navItem} ${isActive('/admin/performance-slider') ? styles.active : ''}`}
                                >
                                    <span className={styles.navIcon}></span>
                                    {isMenuOpen && <span>Performance Slider</span>}
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="/admin/examination" 
                                    className={`${styles.navItem} ${isActive('/admin/examination') ? styles.active : ''}`}
                                >
                                    <span className={styles.navIcon}></span>
                                    {isMenuOpen && <span>Examination</span>}
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="/admin/invoices" 
                                    className={`${styles.navItem} ${isActive('/admin/invoices') ? styles.active : ''}`}
                                >
                                    <span className={styles.navIcon}></span>
                                    {isMenuOpen && <span>Invoices</span>}
                                </a>
                            </li>
                        </>
                    )}
                </ul>
            </nav>

            <div className={styles.sidebarFooter}>
                <div className={styles.userProfile}>
                    <div className={styles.userAvatar}>A</div>
                    {isMenuOpen && (
                        <div className={styles.userInfo}>
                            <div className={styles.userName}>Welcome, Admin</div>
                            <div className={styles.userRole}>System Administrator</div>
                        </div>
                    )}
                </div>
                <button onClick={handleLogout} className={styles.logoutBtn}>
                    {isMenuOpen ? 'Logout' : '🚪'}
                </button>
            </div>
        </div>
    )
}

