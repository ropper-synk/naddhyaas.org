import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// GET - Fetch all branch managers
export async function GET(request: NextRequest) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/branch-managers`, {
            cache: 'no-store'
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Get Branch Managers API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch branch managers' },
            { status: 500 }
        );
    }
}

// POST - Add new branch manager
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const response = await fetch(`${BACKEND_URL}/api/admin/branch-managers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Add Branch Manager API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to add branch manager' },
            { status: 500 }
        );
    }
}
