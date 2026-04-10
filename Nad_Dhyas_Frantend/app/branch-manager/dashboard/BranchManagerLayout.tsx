'use client'

import { ReactNode } from 'react'
import BranchManagerSidebar from './BranchManagerSidebar'
import { SidebarProvider, useSidebar } from '@/app/admin/dashboard/SidebarContext'
import styles from './BranchManagerLayout.module.css'

interface BranchManagerLayoutProps {
    children: ReactNode
    title?: string
    headerActions?: ReactNode
}

function BranchManagerLayoutContent({ children, title = 'Dashboard', headerActions }: BranchManagerLayoutProps) {
    const { isCollapsed } = useSidebar()

    return (
        <div className={styles.layout}>
            <BranchManagerSidebar />
            <div className={`${styles.mainContent} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.headerTitle}>{title}</h1>
                    </div>
                    <div className={styles.headerRight}>
                        {headerActions}
                    </div>
                </header>
                <div className={styles.contentArea}>
                    {children}
                </div>
            </div>
        </div>
    )
}

export default function BranchManagerLayout(props: BranchManagerLayoutProps) {
    return (
        <SidebarProvider>
            <BranchManagerLayoutContent {...props} />
        </SidebarProvider>
    )
}
