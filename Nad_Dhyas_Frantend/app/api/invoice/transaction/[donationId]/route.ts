import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ donationId: string }> }
) {
    try {
        const { donationId } = await params;
        console.log(`[FRONTEND API] Fetching transaction invoice for donation ID: ${donationId}`);
        
        const backendUrl = `${BACKEND_URL}/api/invoice/transaction/${donationId}`;
        
        const response = await fetch(backendUrl, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
            }
        });

        if (!response.ok) {
            console.error(`[FRONTEND API] Backend error for donation ${donationId}:`, response.status);
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            return NextResponse.json(
                { 
                    error: errorData.error || 'Failed to fetch invoice',
                    donationId,
                    status: response.status 
                },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log(`[FRONTEND API] Successfully fetched invoice for donation ${donationId}, amount: ₹${data.amountPaid}`);
        
        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error) {
        console.error('[FRONTEND API] Error fetching transaction invoice:', error);
        return NextResponse.json(
            { error: 'Failed to fetch invoice' },
            { status: 500 }
        );
    }
}
