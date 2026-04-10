import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        if (!studentId) {
            return NextResponse.json(
                { success: false, error: 'Student ID required' },
                { status: 400 }
            );
        }
        const response = await fetch(
            `${BACKEND_URL}/api/examination/registration?studentId=${encodeURIComponent(studentId)}`,
            { cache: 'no-store' }
        );
        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to fetch registration' },
                { status: response.status }
            );
        }
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[API] Examination registration GET error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to fetch registration' },
            { status: 500 }
        );
    }
}
