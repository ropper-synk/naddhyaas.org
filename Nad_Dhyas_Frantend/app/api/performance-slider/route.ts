import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/performance-slider`, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
        })
        const data = await res.json()
        if (!res.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to fetch slider images' },
                { status: res.status }
            )
        }
        return NextResponse.json(data)
    } catch (error: unknown) {
        const isConnectionRefused =
            error instanceof Error &&
            (error.cause as { code?: string })?.code === 'ECONNREFUSED'
        console.error('Performance slider fetch error:', error)
        // When backend is not running, return empty data so the page still loads
        if (isConnectionRefused) {
            return NextResponse.json({
                success: true,
                images: [],
                message: 'Backend unavailable; slider data not loaded. Start the backend on ' + BACKEND_URL,
            })
        }
        return NextResponse.json(
            { success: false, error: 'Failed to fetch slider images' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const res = await fetch(`${BACKEND_URL}/api/performance-slider`, {
            method: 'POST',
            body: formData,
        })
        const data = await res.json()
        if (!res.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to add image' },
                { status: res.status }
            )
        }
        return NextResponse.json(data)
    } catch (error: unknown) {
        const isConnectionRefused =
            error instanceof Error &&
            (error.cause as { code?: string })?.code === 'ECONNREFUSED'
        console.error('Performance slider upload error:', error)
        if (isConnectionRefused) {
            return NextResponse.json(
                { success: false, error: 'Backend server is not running. Start it on ' + BACKEND_URL },
                { status: 503 }
            )
        }
        return NextResponse.json(
            { success: false, error: 'Failed to add image' },
            { status: 500 }
        )
    }
}
