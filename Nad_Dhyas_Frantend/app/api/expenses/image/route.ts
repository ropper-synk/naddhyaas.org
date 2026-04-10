import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const imagePath = searchParams.get('path');

        if (!imagePath) {
            return NextResponse.json(
                { success: false, error: 'Image path is required' },
                { status: 400 }
            );
        }

        // Construct full URL
        const imageUrl = imagePath.startsWith('http')
            ? imagePath
            : `${BACKEND_URL}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;

        // Fetch image from backend
        const response = await fetch(imageUrl, {
            method: 'GET',
            headers: {
                'Accept': 'image/*',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: `Failed to fetch image: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        // Get the image as a blob
        const blob = await response.blob();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Return the image with proper headers
        return new NextResponse(blob, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${imagePath.split('/').pop()}"`,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error proxying image:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch image',
            },
            { status: 500 }
        );
    }
}
