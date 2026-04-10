import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: Request) {
    try {
        const data = await request.json();

        console.log('[FRONTEND API] Submitting donation to:', `${BACKEND_URL}/api/donate`);
        console.log('[FRONTEND API] Donation data:', { receiptNo: data.receiptNo, donatedBy: data.donatedBy });

        // Forward request to Express backend
        const response = await fetch(`${BACKEND_URL}/api/donate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        console.log('[FRONTEND API] Response status:', response.status);

        const result = await response.json();
        console.log('[FRONTEND API] Response data:', result);

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: result.error || 'Donation failed' },
                { status: response.status }
            );
        }

        return NextResponse.json(
            { 
                success: true, 
                receiptNo: result.receiptNo || data.receiptNo,
                id: result.id
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('[FRONTEND API] Donation Error:', error);
        console.error('[FRONTEND API] Error details:', {
            message: error.message,
            code: error.code,
            cause: error.cause,
            name: error.name
        });

        // Handle connection errors
        if (error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED' || error?.message?.includes('fetch failed')) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: `Backend server is not available. Please ensure the backend server is running on ${BACKEND_URL}` 
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Donation submission failed. Please try again later.' 
            },
            { status: 500 }
        );
    }
}
