import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const response = await fetch(`${BACKEND_URL}/api/branch-manager/students/${id}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
            }
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Branch Manager Students API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch students' },
            { status: 500 }
        );
    }
}
