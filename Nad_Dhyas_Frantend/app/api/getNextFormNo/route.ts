import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const branch = searchParams.get('branch');

        if (!branch) {
            return NextResponse.json({ error: 'Branch is required' }, { status: 400 });
        }

        // Forward request to Express backend
        const response = await fetch(`${BACKEND_URL}/api/getNextFormNo?branch=${encodeURIComponent(branch)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Check if response is ok before parsing JSON
        if (!response.ok) {
            let errorMessage = 'Failed to fetch form no';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage;
            }
            return NextResponse.json(
                { error: errorMessage },
                { status: response.status }
            );
        }

        const result = await response.json();
        return NextResponse.json({ formNo: result.formNo });
    } catch (error: any) {
        console.error('Error fetching next form No:', error);
        
        // Check if it's a connection error
        if (error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED') {
            return NextResponse.json(
                { 
                    error: 'Backend server is not available. Please ensure the backend server is running on ' + BACKEND_URL 
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch form no. Please try again later.' },
            { status: 500 }
        );
    }
}
