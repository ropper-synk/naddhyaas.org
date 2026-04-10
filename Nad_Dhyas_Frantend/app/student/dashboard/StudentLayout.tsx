'use client'

import { ReactNode } from 'react'
import StudentSidebar from './StudentSidebar'
import styles from './StudentLayout.module.css'

interface StudentLayoutProps {
    children: ReactNode
    title?: string
    headerActions?: ReactNode
}

export default function StudentLayout({ 
    children, 
    title = 'Dashboard', 
    headerActions
}: StudentLayoutProps) {
    return (
        <div className={styles.layout}>
            <StudentSidebar />
            <div className={styles.mainContent}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.headerTitle}>{title}</h1>
                    </div>
                    <div className={styles.headerRight}>
                        {headerActions}
                    </div>
                </header>
                <main className={styles.contentArea}>
                    {children}
                </main>
            </div>
        </div>
    )
}
