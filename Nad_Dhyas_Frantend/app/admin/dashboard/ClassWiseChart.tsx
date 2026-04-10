'use client'

import { useEffect, useRef } from 'react'

interface ClassWiseData {
    year: string
    count: number
}

interface ClassWiseChartProps {
    data: ClassWiseData[]
}

export default function ClassWiseChart({ data }: ClassWiseChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!canvasRef.current || !data || data.length === 0) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        ctx.scale(dpr, dpr)

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height)

        // Calculate dimensions
        const padding = 60
        const chartWidth = rect.width - padding * 2
        const chartHeight = rect.height - padding * 2

        // Find max value for scaling
        const maxValue = Math.max(...data.map(d => d.count), 1)
        const yScale = chartHeight / maxValue

        // Bar width and spacing
        const barWidth = chartWidth / data.length * 0.6
        const barSpacing = chartWidth / data.length

        // Colors for different years
        const colors = {
            'First Year': '#3b82f6',     // Blue
            'Second Year': '#10b981',    // Green
            'Third Year': '#f59e0b',     // Orange
            'Not Specified': '#6b7280'   // Gray
        }

        // Draw bars
        data.forEach((item, index) => {
            const x = padding + index * barSpacing + (barSpacing - barWidth) / 2
            const barHeight = item.count * yScale
            const y = rect.height - padding - barHeight

            // Draw bar with gradient
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
            const color = colors[item.year as keyof typeof colors] || colors['Not Specified']
            gradient.addColorStop(0, color)
            gradient.addColorStop(1, color + 'CC')

            ctx.fillStyle = gradient
            ctx.fillRect(x, y, barWidth, barHeight)

            // Draw value on top of bar
            ctx.fillStyle = '#111827'
            ctx.font = 'bold 14px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(item.count.toString(), x + barWidth / 2, y - 8)

            // Draw year label
            ctx.fillStyle = '#374151'
            ctx.font = '12px Arial'
            ctx.textAlign = 'center'
            
            // Split long labels
            const label = item.year.replace(' Year', '')
            const lines = label.split(' ')
            lines.forEach((line, lineIndex) => {
                ctx.fillText(
                    line,
                    x + barWidth / 2,
                    rect.height - padding + 20 + lineIndex * 14
                )
            })
        })

        // Draw Y-axis
        ctx.strokeStyle = '#d1d5db'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(padding, padding)
        ctx.lineTo(padding, rect.height - padding)
        ctx.lineTo(rect.width - padding, rect.height - padding)
        ctx.stroke()

        // Draw Y-axis labels and grid lines
        const steps = 5
        const stepValue = Math.ceil(maxValue / steps)
        ctx.fillStyle = '#6b7280'
        ctx.font = '12px Arial'
        ctx.textAlign = 'right'
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 1

        for (let i = 0; i <= steps; i++) {
            const value = i * stepValue
            const y = rect.height - padding - (value * yScale)
            
            // Y-axis label
            ctx.fillText(value.toString(), padding - 10, y + 4)
            
            // Grid line
            ctx.setLineDash([5, 5])
            ctx.beginPath()
            ctx.moveTo(padding, y)
            ctx.lineTo(rect.width - padding, y)
            ctx.stroke()
            ctx.setLineDash([])
        }

        // Draw title
        ctx.fillStyle = '#111827'
        ctx.font = 'bold 16px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('Students by Diploma Year', rect.width / 2, 30)

    }, [data])

    if (!data || data.length === 0) {
        return (
            <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#6b7280',
                fontSize: '14px' 
            }}>
                No class-wise data available
            </div>
        )
    }

    return (
        <div style={{ width: '100%', height: '400px', position: 'relative' }}>
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block'
                }}
            />
        </div>
    )
}
