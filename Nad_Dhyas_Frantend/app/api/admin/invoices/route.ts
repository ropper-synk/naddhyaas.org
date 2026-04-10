import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        console.log('[API] Admin invoices request:', { adminRole: body.adminRole, adminBranch: body.adminBranch })
        
        const response = await fetch(`${BACKEND_URL}/api/admin/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        
        console.log('[API] Backend response status:', response.status)
        const data = await response.json()
        console.log('[API] Backend response data:', { success: data.success, count: data.data?.length || 0, error: data.error })
        
        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || data.details || 'Failed to fetch invoices' },
                { status: response.status }
            )
        }
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[API] Admin invoices fetch error:', error)
        const isConnectionRefused =
            error instanceof Error &&
            (error.cause as { code?: string })?.code === 'ECONNREFUSED'
        if (isConnectionRefused) {
            return NextResponse.json(
                { success: false, error: 'Backend server is not running. Start it on ' + BACKEND_URL },
                { status: 503 }
            )
        }
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch invoices' },
            { status: 500 }
        )
    }
}
