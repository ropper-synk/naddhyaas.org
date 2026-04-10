'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSidebar } from '@/app/admin/dashboard/SidebarContext'
import styles from './BranchManagerSidebar.module.css'

export default function BranchManagerSidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const { isCollapsed, setIsCollapsed } = useSidebar()
    const [isMenuOpen, setIsMenuOpen] = useState(!isCollapsed)
    const [managerName, setManagerName] = useState<string>('Manager')
    const [branchName, setBranchName] = useState<string>('')

    useEffect(() => {
        const managerData = localStorage.getItem('branchManager')
        const branchManagerName = localStorage.getItem('branchManagerName')
        const branchManagerBranch = localStorage.getItem('branchManagerBranch')
        
        if (managerData) {
            const manager = JSON.parse(managerData)
            setManagerName(manager.name || branchManagerName || 'Manager')
            setBranchName(manager.branch || branchManagerBranch || '')
        } else if (branchManagerName) {
            setManagerName(branchManagerName)
        }
        
        if (branchManagerBranch) {
            setBranchName(branchManagerBranch)
        }
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
        localStorage.removeItem('branchManager')
        localStorage.removeItem('branchManagerId')
        localStorage.removeItem('branchManagerBranch')
        localStorage.removeItem('branchManagerName')
        router.push('/branch-manager/login')
    }

    const isActive = (path: string) => pathname === path

    return (
        <div className={`${styles.sidebar} ${!isMenuOpen ? styles.collapsed : ''}`}>
            <div className={styles.sidebarHeader}>
                <div className={styles.logo}>
                    <img src="/Logo.png" alt="Logo" className={styles.logoIcon} />
                    <div className={styles.logoText}>
                        <h2>Naad Dhyas</h2>
                        <p>{branchName || 'Branch Manager'}</p>
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
                            href="/branch-manager/dashboard" 
                            className={`${styles.navItem} ${isActive('/branch-manager/dashboard') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>📊</span>
                            {isMenuOpen && <span>Dashboard</span>}
                        </a>
                    </li>
                    <li>
                        <a 
                            href="/branch-manager/students" 
                            className={`${styles.navItem} ${isActive('/branch-manager/students') ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>👥</span>
                            {isMenuOpen && <span>View Students</span>}
                        </a>
                    </li>
                </ul>
            </nav>

            <div className={styles.sidebarFooter}>
                <div className={styles.userProfile}>
                    <div className={styles.userAvatar}>M</div>
                    {isMenuOpen && (
                        <div className={styles.userInfo}>
                            <div className={styles.userName}>{managerName}</div>
                            <div className={styles.userRole}>Branch Manager</div>
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
