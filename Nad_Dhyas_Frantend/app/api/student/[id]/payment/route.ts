import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: studentId } = await params;
        const body = await request.json();

        console.log('Payment request received:', { studentId, amount: body.amount });

        const response = await fetch(`${BACKEND_URL}/api/student/${studentId}/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Payment failed:', result.error);
            return NextResponse.json(
                { success: false, error: result.error || 'Failed to process payment' },
                { status: response.status }
            );
        }

        console.log('Payment successful:', { 
            studentId, 
            totalPaid: result.totalPaid, 
            remainingFee: result.remainingFee 
        });

        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to process payment' 
            },
            { status: 500 }
        );
    }
}
