import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, phone } = body;
        
        // Validate inputs
        if (!name || !phone) {
            return NextResponse.json(
                { success: false, error: 'Name and Contact Number are required' },
                { status: 400 }
            );
        }

        // Forward to backend
        const response = await fetch(`${BACKEND_URL}/api/student/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, phone }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Login failed' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Student Login API Error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'An error occurred during login. Please try again.' 
            },
            { status: 500 }
        );
    }
}
