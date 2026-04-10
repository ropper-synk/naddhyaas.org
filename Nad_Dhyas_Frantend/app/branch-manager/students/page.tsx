'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BranchManagerLayout from '../dashboard/BranchManagerLayout';
import styles from './Students.module.css';

interface Student {
    admission_id: number;
    full_name: string;
    form_no: string;
    branch: string;
    phone: string;
    email: string;
    admission_date: string;
    diploma_admission_year: string | null;
    total_fee: number;
    amount_paid: number;
    remaining_fee: number;
    payment_count: number;
}

export default function BranchManagerStudents() {
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('all');
    const [branch, setBranch] = useState('');
    const router = useRouter();

    useEffect(() => {
        const managerData = localStorage.getItem('branchManager');
        if (!managerData) {
            router.push('/branch-manager/login');
            return;
        }

        const manager = JSON.parse(managerData);
        setBranch(manager.branch);
        fetchStudents(manager.id);
    }, [router]);

    useEffect(() => {
        filterStudentsList();
    }, [searchTerm, filterYear, students]);

    const fetchStudents = async (managerId: number) => {
        try {
            const res = await fetch(`/api/branch-manager/students/${managerId}`, {
                cache: 'no-store'
            });

            const data = await res.json();

            if (data.success) {
                // Convert string numbers to actual numbers
                const processedStudents = data.students.map((student: any) => ({
                    ...student,
                    total_fee: parseFloat(student.total_fee) || 0,
                    amount_paid: parseFloat(student.amount_paid) || 0,
                    remaining_fee: parseFloat(student.remaining_fee) || 0,
                    payment_count: parseInt(student.payment_count) || 0
                }));
                setStudents(processedStudents);
                setFilteredStudents(processedStudents);
            } else {
                setError(data.error || 'Failed to load students');
            }
        } catch (error) {
            console.error('Error:', error);
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const filterStudentsList = () => {
        let filtered = students;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(student =>
                student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.form_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.phone.includes(searchTerm)
            );
        }

        // Year filter
        if (filterYear !== 'all') {
            filtered = filtered.filter(student =>
                student.diploma_admission_year === filterYear
            );
        }

        setFilteredStudents(filtered);
    };

    if (loading) {
        return (
            <BranchManagerLayout title="Loading...">
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Loading students...</p>
                </div>
            </BranchManagerLayout>
        );
    }

    if (error) {
        return (
            <BranchManagerLayout title="Error">
                <div className={styles.error}>
                    <h2>Error</h2>
                    <p>{error}</p>
                </div>
            </BranchManagerLayout>
        );
    }

    const uniqueYears = Array.from(new Set(students.map(s => s.diploma_admission_year).filter(Boolean))) as string[];

    return (
        <BranchManagerLayout 
            title={`Students - ${branch}`}
            headerActions={
                <div className={styles.studentCount}>
                    Showing {filteredStudents.length} of {students.length} students
                </div>
            }
        >
            <div className={styles.container}>

            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="Search by name, form no, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
                <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="all">All Years</option>
                    {uniqueYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            {filteredStudents.length === 0 ? (
                <div className={styles.noData}>
                    <h3>No students found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.studentsTable}>
                        <thead>
                            <tr>
                                <th>Form No</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Year</th>
                                <th>Total Fee</th>
                                <th>Paid</th>
                                <th>Remaining</th>
                                <th>Payments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student) => (
                                <tr key={student.admission_id}>
                                    <td>{student.form_no}</td>
                                    <td className={styles.nameCell}>{student.full_name}</td>
                                    <td>{student.phone}</td>
                                    <td>{student.diploma_admission_year || 'N/A'}</td>
                                    <td className={styles.feeCell}>
                                        ₹{student.total_fee.toLocaleString()}
                                    </td>
                                    <td className={styles.paidCell}>
                                        ₹{student.amount_paid.toLocaleString()}
                                    </td>
                                    <td className={styles.remainingCell}>
                                        <span className={student.remaining_fee > 0 ? styles.pending : styles.complete}>
                                            ₹{student.remaining_fee.toLocaleString()}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={styles.paymentBadge}>
                                            {student.payment_count || 0}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className={styles.summary}>
                <div className={styles.summaryCard}>
                    <h4>Total Students</h4>
                    <p>{filteredStudents.length}</p>
                </div>
                <div className={styles.summaryCard}>
                    <h4>Total Collected</h4>
                    <p>₹{filteredStudents.reduce((sum, s) => sum + s.amount_paid, 0).toLocaleString()}</p>
                </div>
                <div className={styles.summaryCard}>
                    <h4>Total Remaining</h4>
                    <p>₹{filteredStudents.reduce((sum, s) => sum + s.remaining_fee, 0).toLocaleString()}</p>
                </div>
            </div>
            </div>
        </BranchManagerLayout>
    );
}
