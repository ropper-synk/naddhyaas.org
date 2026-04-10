import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    try {
        // We will store the count in a file in the data/ directory
        // This file will naturally persist across regular app restarts
        const counterFilePath = path.join(process.cwd(), 'data', 'visitor-count.json');

        // Ensure data directory exists
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        let count = 0;

        // Read the existing count
        if (fs.existsSync(counterFilePath)) {
            try {
                const data = fs.readFileSync(counterFilePath, 'utf8');
                const parsed = JSON.parse(data);
                if (typeof parsed.count === 'number') {
                    count = parsed.count;
                }
            } catch (e) {
                console.error("Error reading counter file:", e);
                // Fallback to 0
            }
        }

        const url = new URL(request.url);
        const action = url.searchParams.get('action');

        // Only increment if specifically requested
        if (action === 'increment') {
            count += 1;
            fs.writeFileSync(counterFilePath, JSON.stringify({ count }));
        }

        return NextResponse.json({ count });
    } catch (error) {
        console.error('Error updating visitor count:', error);
        return NextResponse.json({ count: 0 }, { status: 500 });
    }
}
