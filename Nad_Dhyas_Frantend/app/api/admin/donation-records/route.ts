import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET() {
    try {
        console.log('[FRONTEND API] Fetching donation records from:', `${BACKEND_URL}/api/admin/donation-records`)
        
        const response = await fetch(`${BACKEND_URL}/api/admin/donation-records`, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        console.log('[FRONTEND API] Response status:', response.status)

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('[FRONTEND API] Error response:', errorData)
            return NextResponse.json(
                { success: false, error: errorData.error || 'Failed to fetch donation records' },
                { status: response.status }
            )
        }

        const data = await response.json()
        console.log('[FRONTEND API] Successfully fetched donation records:', {
            success: data.success,
            donationCount: data.donations?.length || 0,
            hasStats: !!data.stats
        })
        
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[FRONTEND API] Error fetching donation records:', error)
        console.error('[FRONTEND API] Error details:', {
            message: error.message,
            code: error.code,
            cause: error.cause
        })
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to fetch donation records',
                details: 'Check backend server connection and logs'
            },
            { status: 500 }
        )
    }
}
