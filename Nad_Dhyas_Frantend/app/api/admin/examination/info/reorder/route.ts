import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/api/admin/examination/info/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to reorder' },
                { status: response.status }
            );
        }
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[API] Admin examination reorder error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to reorder' },
            { status: 500 }
        );
    }
}
