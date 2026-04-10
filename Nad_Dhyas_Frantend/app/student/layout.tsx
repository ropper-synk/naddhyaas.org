'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import StudentSidebar from './dashboard/StudentSidebar'
import styles from './dashboard/StudentLayout.module.css'

export default function StudentRootLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const isLoginPage = pathname === '/student/login'

    // If it's the login page, render without sidebar
    if (isLoginPage) {
        return <>{children}</>
    }

    // For all other student pages, render with sidebar
    return (
        <div className={styles.layout}>
            <StudentSidebar />
            <div className={styles.mainContent}>
                {children}
            </div>
        </div>
    )
}
