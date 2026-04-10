'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BranchManagerLayout from './BranchManagerLayout';
import FeeCollectionChart from './FeeCollectionChart';
import CategoryChart from './CategoryChart';
import styles from './Dashboard.module.css';

interface DashboardStats {
    branch: string;
    totalStudents: number;
    totalCollected: number;
    totalRemaining: number;
    categoryWise: Array<{
        category: string;
        count: number;
    }>;
    manager: {
        id: number;
        name: string;
        email: string;
        contactNo: string;
    };
}

export default function BranchManagerDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        const managerData = localStorage.getItem('branchManager');
        if (!managerData) {
            router.push('/branch-manager/login');
            return;
        }

        const manager = JSON.parse(managerData);
        fetchDashboardStats(manager.id);
    }, [router]);

    const fetchDashboardStats = async (managerId: number) => {
        try {
            const res = await fetch(`/api/branch-manager/dashboard/${managerId}`, {
                cache: 'no-store'
            });

            const data = await res.json();

            if (data.success) {
                // Convert string numbers to actual numbers
                const processedStats = {
                    ...data.stats,
                    totalCollected: parseFloat(data.stats.totalCollected) || 0,
                    totalRemaining: parseFloat(data.stats.totalRemaining) || 0
                };
                setStats(processedStats);
            } else {
                setError(data.error || 'Failed to load dashboard');
            }
        } catch (error) {
            console.error('Error:', error);
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <BranchManagerLayout title="Loading...">
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Loading dashboard...</p>
                </div>
            </BranchManagerLayout>
        );
    }

    if (error || !stats) {
        return (
            <BranchManagerLayout title="Error">
                <div className={styles.error}>
                    <h2>Error</h2>
                    <p>{error || 'No data available'}</p>
                </div>
            </BranchManagerLayout>
        );
    }

    return (
        <BranchManagerLayout 
            title="Dashboard"
            headerActions={
                <div className={styles.welcomeText}>
                    Welcome, {stats.manager.name}
                </div>
            }
        >
            <div className={styles.container}>

            <div className={styles.branchInfo}>
                <h2 className={styles.branchName}>{stats.branch}</h2>
                <p>Contact: {stats.manager.contactNo} | Email: {stats.manager.email}</p>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>👥</div>
                    <div className={styles.statContent}>
                        <h3>Total Students</h3>
                        <p className={styles.statValue}>{stats.totalStudents}</p>
                        <span className={styles.statLabel}>Enrolled in your branch</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>💰</div>
                    <div className={styles.statContent}>
                        <h3>Total Fee Collected</h3>
                        <p className={styles.statValue}>₹{stats.totalCollected.toLocaleString()}</p>
                        <span className={styles.statLabel}>All-time collection</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>⚠️</div>
                    <div className={styles.statContent}>
                        <h3>Remaining Fee</h3>
                        <p className={styles.statValue}>₹{stats.totalRemaining.toLocaleString()}</p>
                        <span className={styles.statLabel}>Yet to be collected</span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className={styles.chartsSection}>
                <div className={styles.chartCard}>
                    <h2 className={styles.sectionTitle}>Fee Collection Overview</h2>
                    <FeeCollectionChart 
                        totalCollected={stats.totalCollected}
                        totalRemaining={stats.totalRemaining}
                    />
                </div>

                <div className={styles.chartCard}>
                    <h2 className={styles.sectionTitle}>Category-wise Distribution</h2>
                    <CategoryChart data={stats.categoryWise} />
                </div>
            </div>

            <div className={styles.categorySection}>
                <h2 className={styles.sectionTitle}>Category Summary</h2>
                <div className={styles.categoryGrid}>
                    {stats.categoryWise.length > 0 ? (
                        stats.categoryWise.map((cat, index) => (
                            <div key={index} className={styles.categoryCard}>
                                <h4>{cat.category || 'Not Specified'}</h4>
                                <p className={styles.categoryCount}>{cat.count} Students</p>
                            </div>
                        ))
                    ) : (
                        <div className={styles.noData}>
                            No category data available
                        </div>
                    )}
                </div>
            </div>

            </div>
        </BranchManagerLayout>
    );
}
