'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../dashboard/AdminLayout';
import styles from './BranchManagers.module.css';

interface BranchManager {
    id: number;
    name: string;
    email: string;
    contactNo: string;
    branch: string;
    createdAt: string;
}

const branches = [
    'Karmaveer Nagar Society',
    'Godoli, Satara',
    'Krantismruti, Satara',
    'Karad'
];

export default function BranchManagersPage() {
    const [managers, setManagers] = useState<BranchManager[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contactNo: '',
        branch: '',
        password: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check if admin is logged in (match admin dashboard authentication)
        const adminRole = localStorage.getItem('adminRole');
        const isRootAdmin = localStorage.getItem('isRootAdmin');
        const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
        
        console.log('🔐 Branch Managers - Checking auth:', {
            adminRole,
            isRootAdmin,
            isAdminLoggedIn
        });

        // Check if user is logged in as ROOT admin
        if (adminRole !== 'ROOT' && isRootAdmin !== 'true' && isAdminLoggedIn !== 'true') {
            console.log('❌ Not authenticated, redirecting to login');
            router.push('/admin/login');
            return;
        }

        console.log('✅ Authenticated, fetching managers');
        fetchManagers();
    }, [router]);

    const fetchManagers = async () => {
        try {
            const res = await fetch('/api/admin/branch-managers');
            const data = await res.json();

            if (data.success) {
                setManagers(data.managers);
            }
        } catch (error) {
            console.error('Error fetching managers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch('/api/admin/branch-managers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.success) {
                alert('Branch Manager added successfully!');
                setShowAddModal(false);
                setFormData({ name: '', email: '', contactNo: '', branch: '', password: '' });
                fetchManagers();
            } else {
                alert(data.error || 'Failed to add branch manager');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this branch manager?')) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/branch-managers/${id}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (data.success) {
                alert('Branch Manager deleted successfully!');
                fetchManagers();
            } else {
                alert(data.error || 'Failed to delete branch manager');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred');
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className={styles.loading}>Loading...</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Branch Managers</h1>
                        <p style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                            Manage branch manager accounts and access
                        </p>
                    </div>
                    <button
                        className={styles.addButton}
                        onClick={() => setShowAddModal(true)}
                    >
                        + Add Branch Manager
                    </button>
                </div>

            <div className={styles.managersGrid}>
                {managers.length === 0 ? (
                    <div className={styles.noData}>
                        No branch managers found. Click "Add Branch Manager" to create one.
                    </div>
                ) : (
                    managers.map(manager => (
                        <div key={manager.id} className={styles.managerCard}>
                            <div className={styles.managerHeader}>
                                <h3 className={styles.managerName}>{manager.name}</h3>
                                <span className={styles.branchBadge}>{manager.branch}</span>
                            </div>
                            <div className={styles.managerDetails}>
                                <p><strong>Email:</strong> {manager.email}</p>
                                <p><strong>Contact:</strong> {manager.contactNo}</p>
                                <p><strong>Created:</strong> {new Date(manager.createdAt).toLocaleDateString()}</p>
                            </div>
                            <button
                                className={styles.deleteButton}
                                onClick={() => handleDelete(manager.id)}
                            >
                                Delete
                            </button>
                        </div>
                    ))
                )}
            </div>

            {showAddModal && (
                <div className={styles.modal} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Add Branch Manager</h2>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Contact Number *</label>
                                <input
                                    type="tel"
                                    value={formData.contactNo}
                                    onChange={e => setFormData({...formData, contactNo: e.target.value})}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Branch *</label>
                                <select
                                    value={formData.branch}
                                    onChange={e => setFormData({...formData, branch: e.target.value})}
                                    required
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(branch => (
                                        <option key={branch} value={branch}>{branch}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Password *</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className={styles.formActions}>
                                <button type="button" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}>
                                    {submitting ? 'Adding...' : 'Add Manager'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </AdminLayout>
    );
}
