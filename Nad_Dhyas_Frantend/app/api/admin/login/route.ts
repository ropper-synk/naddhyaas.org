import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Forward request to Express backend
        const response = await fetch(`${BACKEND_URL}/api/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // If backend returns HTML (404, error page, etc.), it means backend is down or URL is wrong
            const text = await response.text();
            console.error('Backend returned non-JSON response:', text.substring(0, 200));
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Backend server is not responding. Please check if the backend server is running on ' + BACKEND_URL
                },
                { status: 503 }
            );
        }

        const result = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: result.error || 'Login failed' },
                { status: response.status }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Admin Login Error:', error);
        
        // Check if it's a network error (backend not reachable)
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: `Cannot connect to backend server at ${BACKEND_URL}. Please ensure the backend is running.`
                },
                { status: 503 }
            );
        }
        
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Login failed' 
            },
            { status: 500 }
        );
    }
}


