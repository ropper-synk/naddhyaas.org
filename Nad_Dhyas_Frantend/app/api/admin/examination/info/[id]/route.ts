import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/api/admin/examination/info/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to update exam info' },
                { status: response.status }
            );
        }
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[API] Admin examination info PUT error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to update exam info' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const response = await fetch(`${BACKEND_URL}/api/admin/examination/info/${id}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to delete exam info' },
                { status: response.status }
            );
        }
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[API] Admin examination info DELETE error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to delete exam info' },
            { status: 500 }
        );
    }
}
