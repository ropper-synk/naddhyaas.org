import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
    try {
        const pathParam = request.nextUrl.searchParams.get('path')
        if (!pathParam) {
            return NextResponse.json(
                { success: false, error: 'Image path is required' },
                { status: 400 }
            )
        }
        const imageUrl = pathParam.startsWith('http')
            ? pathParam
            : `${BACKEND_URL}${pathParam.startsWith('/') ? pathParam : '/' + pathParam}`
        const response = await fetch(imageUrl, { method: 'GET', headers: { Accept: 'image/*' } })
        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: `Failed to fetch image: ${response.status}` },
                { status: response.status }
            )
        }
        const blob = await response.blob()
        const contentType = response.headers.get('content-type') || 'image/jpeg'
        return new NextResponse(blob, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${pathParam.split('/').pop()}"`,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        })
    } catch (error) {
        console.error('Performance slider image proxy error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch image' },
            { status: 500 }
        )
    }
}
