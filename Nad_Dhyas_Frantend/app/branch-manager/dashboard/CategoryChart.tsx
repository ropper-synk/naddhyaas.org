'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface CategoryData {
    category: string
    count: number
}

interface CategoryChartProps {
    data: CategoryData[]
}

export default function CategoryChart({ data }: CategoryChartProps) {
    const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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
                    <p style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {payload[0].payload.category || 'Not Specified'}
                    </p>
                    <p style={{ color: payload[0].fill, margin: '4px 0' }}>
                        Students: <strong>{payload[0].value}</strong>
                    </p>
                </div>
            )
        }
        return null
    }

    if (!data || data.length === 0) {
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
                No category data available
            </div>
        )
    }

    // Format data and handle empty categories
    const chartData = data.map(item => ({
        ...item,
        category: item.category || 'Not Specified'
    }))

    return (
        <div style={{ width: '100%', height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 60,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                        dataKey="category" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        style={{ fontSize: '12px' }}
                        tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                        tick={{ fill: '#6b7280' }}
                        style={{ fontSize: '12px' }}
                        allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                        dataKey="count" 
                        radius={[8, 8, 0, 0]}
                        label={{ position: 'top', fill: '#111827', fontSize: '14px', fontWeight: 'bold' }}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
