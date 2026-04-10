'use client';

import { useEffect, useState } from 'react';

export default function VisitorCounter() {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        // We only want to increment the count once per session or visit
        // Using session storage to ensure we don't increment on every route change
        const hasVisited = sessionStorage.getItem('hasVisitedSession');

        const action = hasVisited ? 'get' : 'increment';

        fetch(`/api/visitor-count?action=${action}`)
            .then(res => res.json())
            .then(data => {
                if (data && typeof data.count === 'number') {
                    setCount(data.count);
                    if (!hasVisited) {
                        sessionStorage.setItem('hasVisitedSession', 'true');
                    }
                }
            })
            .catch(err => console.error("Error fetching visitor count:", err));
    }, []);

    if (count === null) {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '6px 16px',
                borderRadius: '8px',
                marginTop: '15px',
                minWidth: '100px',
                height: '36px'
            }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Loading...</span>
            </div>
        );
    }

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(255,183,77,0.15) 0%, rgba(255,138,101,0.15) 100%)',
            padding: '10px 22px',
            borderRadius: '12px',
            marginTop: '25px',
            border: '1px solid rgba(255, 183, 77, 0.3)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'default',
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.1)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,183,77,0.25) 0%, rgba(255,138,101,0.25) 100%)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.05)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,183,77,0.15) 0%, rgba(255,138,101,0.15) 100%)';
            }}>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{
                    color: '#ffffff',
                    fontWeight: '800',
                    fontFamily: "'Space Grotesk', 'Inter', monospace",
                    fontSize: '24px',
                    letterSpacing: '3px',
                    textShadow: '0 2px 10px rgba(255, 183, 77, 0.4)',
                    lineHeight: '1.2'
                }}>
                    {count.toString().padStart(6, '0')}
                </span>
                <span style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    fontWeight: '600',
                    marginTop: '2px'
                }}>
                    Total Visitors
                </span>
            </div>
        </div>
    );
}
