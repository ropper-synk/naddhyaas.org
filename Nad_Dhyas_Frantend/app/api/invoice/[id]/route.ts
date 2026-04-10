import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        console.log(`[INVOICE API] Fetching invoice for admission ID: ${id}`);
        
        // Forward request to Express backend with cache-busting
        const response = await fetch(`${BACKEND_URL}/api/invoice/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            cache: 'no-store'
        });

        const result = await response.json();
        
        console.log(`[INVOICE API] Amount for ${id}: ₹${result.amountPaid || 'N/A'}`);

        if (!response.ok) {
            console.error(`[INVOICE API] ❌ Backend returned error:`, {
                status: response.status,
                error: result.error,
                studentId: id
            });
            
            return NextResponse.json(
                { 
                    error: result.error || 'Failed to fetch invoice',
                    studentId: id,
                    status: response.status
                },
                { status: response.status }
            );
        }

        // Return with no-cache headers
        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error) {
        console.error('Invoice Fetch Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch invoice' },
            { status: 500 }
        );
    }
}
