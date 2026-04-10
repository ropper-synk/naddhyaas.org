import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const res = await fetch(`${BACKEND_URL}/api/performance-slider/${id}`, {
            method: 'DELETE',
        })
        const data = await res.json()
        if (!res.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to delete image' },
                { status: res.status }
            )
        }
        return NextResponse.json(data)
    } catch (error) {
        console.error('Performance slider delete error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete image' },
            { status: 500 }
        )
    }
}
