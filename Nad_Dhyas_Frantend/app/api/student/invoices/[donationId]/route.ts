import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ donationId: string }> }
) {
    try {
        const { donationId } = await params
        const body = await request.json().catch(() => ({}))
        const response = await fetch(`${BACKEND_URL}/api/student/invoices/${donationId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        const data = await response.json()
        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to delete invoice' },
                { status: response.status }
            )
        }
        return NextResponse.json(data)
    } catch (error) {
        console.error('Student invoice delete error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete invoice' },
            { status: 500 }
        )
    }
}
