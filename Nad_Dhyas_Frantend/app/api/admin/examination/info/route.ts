import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/api/admin/examination/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to add exam info' },
                { status: response.status }
            );
        }
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error('[API] Admin examination info POST error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to add exam info' },
            { status: 500 }
        );
    }
}
