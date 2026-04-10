import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// DELETE - Delete branch manager
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const response = await fetch(`${BACKEND_URL}/api/admin/branch-managers/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Delete Branch Manager API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete branch manager' },
            { status: 500 }
        );
    }
}
