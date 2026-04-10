import React from 'react';
import ScrollAnimation from './ScrollAnimation';
import styles from './StatsBanner.module.css';

export default function StatsBanner() {
    const stats = [
        { value: '200+', label: 'Happy Students' },
        { value: '4', label: 'Active Branches' },
        { value: '11', label: 'Music Courses' },
    ];

    return (
        <section className={styles.statsSection}>
            <div className="container">
                <ScrollAnimation animationType="fadeInUp" delay={0.1}>
                    <div className={styles.statsContainer}>
                        {stats.map((stat, index) => (
                            <React.Fragment key={index}>
                                <div className={styles.statItem}>
                                    <div className={styles.textContent}>
                                        <h3 className={styles.statValue}>{stat.value}</h3>
                                        <p className={styles.statLabel}>{stat.label}</p>
                                    </div>
                                </div>
                                {index < stats.length - 1 && (
                                    <div className={styles.divider}></div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </ScrollAnimation>
            </div>
        </section>
    );
}
