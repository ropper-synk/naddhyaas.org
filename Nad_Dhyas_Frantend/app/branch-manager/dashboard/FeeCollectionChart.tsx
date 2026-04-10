'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface FeeCollectionChartProps {
    totalCollected: number
    totalRemaining: number
}

export default function FeeCollectionChart({ totalCollected, totalRemaining }: FeeCollectionChartProps) {
    const data = [
        { name: 'Collected', value: totalCollected },
        { name: 'Remaining', value: totalRemaining }
    ]

    const COLORS = ['#10b981', '#f59e0b']

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ fontWeight: '600', marginBottom: '4px' }}>{payload[0].name}</p>
                    <p style={{ color: payload[0].payload.fill, margin: '4px 0' }}>
                        <strong>₹{payload[0].value.toLocaleString('en-IN')}</strong>
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>
                        {((payload[0].value / (totalCollected + totalRemaining)) * 100).toFixed(1)}%
                    </p>
                </div>
            )
        }
        return null
    }

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5
        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)

        return (
            <text 
                x={x} 
                y={y} 
                fill="white" 
                textAnchor={x > cx ? 'start' : 'end'} 
                dominantBaseline="central"
                style={{ fontSize: '14px', fontWeight: 'bold' }}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        )
    }

    if (totalCollected === 0 && totalRemaining === 0) {
        return (
            <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#6b7280',
                fontSize: '14px',
                height: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                No fee collection data available
            </div>
        )
    }

    return (
        <div style={{ width: '100%', height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}
