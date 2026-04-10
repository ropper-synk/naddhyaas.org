import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/donate/receipt-no`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return NextResponse.json(
                { error: errorData.error || 'Failed to fetch receipt number' },
                { status: response.status }
            )
        }

        const result = await response.json()
        return NextResponse.json({ receiptNo: result.receiptNo })
    } catch (error: any) {
        console.error('Error fetching donation receipt number:', error)
        
        if (error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED') {
            return NextResponse.json(
                { 
                    error: 'Backend server is not available. Please ensure the backend server is running on ' + BACKEND_URL 
                },
                { status: 503 }
            )
        }

        return NextResponse.json(
            { error: 'Failed to fetch receipt number. Please try again later.' },
            { status: 500 }
        )
    }
}
