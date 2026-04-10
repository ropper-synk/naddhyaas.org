import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: donationId } = await params
        const body = await request.json()
        console.log('[FRONTEND API] Updating donation record:', donationId)

        const response = await fetch(`${BACKEND_URL}/api/admin/donation-records/${donationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        })

        console.log('[FRONTEND API] Update response status:', response.status)

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('[FRONTEND API] Error response:', errorData)
            return NextResponse.json(
                { success: false, error: errorData.error || 'Failed to update donation record' },
                { status: response.status }
            )
        }

        const data = await response.json()
        console.log('[FRONTEND API] Successfully updated donation record')
        
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[FRONTEND API] Error updating donation record:', error)
        console.error('[FRONTEND API] Error details:', {
            message: error.message,
            code: error.code,
            cause: error.cause
        })
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to update donation record',
                details: 'Check backend server connection and logs'
            },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: donationId } = await params
        console.log('[FRONTEND API] Deleting donation record:', donationId)

        const response = await fetch(`${BACKEND_URL}/api/admin/donation-records/${donationId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        console.log('[FRONTEND API] Delete response status:', response.status)

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('[FRONTEND API] Error response:', errorData)
            return NextResponse.json(
                { success: false, error: errorData.error || 'Failed to delete donation record' },
                { status: response.status }
            )
        }

        const data = await response.json()
        console.log('[FRONTEND API] Successfully deleted donation record')
        
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[FRONTEND API] Error deleting donation record:', error)
        console.error('[FRONTEND API] Error details:', {
            message: error.message,
            code: error.code,
            cause: error.cause
        })
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to delete donation record',
                details: 'Check backend server connection and logs'
            },
            { status: 500 }
        )
    }
}
