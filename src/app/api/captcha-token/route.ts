import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TEMP_DIR = os.tmpdir();
const TOKEN_FILE = path.join(TEMP_DIR, 'captcha-tokens.json');
const TOKEN_EXPIRY_MS = 90000; // 90 seconds

interface CaptchaToken {
    token: string;
    timestamp: number;
    used: boolean;
}

interface TokenQueue {
    tokens: CaptchaToken[];
    lastUpdated: number;
}

function loadTokens(): TokenQueue {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('Error loading tokens:', e);
    }
    return { tokens: [], lastUpdated: Date.now() };
}

function saveTokens(queue: TokenQueue): void {
    queue.lastUpdated = Date.now();
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(queue, null, 2));
}

// GET: Get token queue status or next available token
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const queue = loadTokens();
    const now = Date.now();

    // Prune expired/used tokens
    queue.tokens = queue.tokens.filter(t =>
        (now - t.timestamp) < TOKEN_EXPIRY_MS && !t.used
    );

    if (action === 'status') {
        // Return status only
        return NextResponse.json({
            available: queue.tokens.length,
            oldestAge: queue.tokens.length > 0
                ? Math.floor((now - Math.min(...queue.tokens.map(t => t.timestamp))) / 1000)
                : null
        });
    }

    // Get next token (marks as used)
    if (queue.tokens.length > 0) {
        const token = queue.tokens[0];
        token.used = true;
        saveTokens(queue);
        return NextResponse.json({
            success: true,
            token: token.token,
            remaining: queue.tokens.filter(t => !t.used).length
        });
    }

    return NextResponse.json({ success: false, error: 'No tokens available' });
}

// POST: Add a new token to the queue
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token, sitekey, domain } = body;

        if (!token || token.length < 100) {
            return NextResponse.json({
                success: false,
                error: 'Invalid token'
            }, { status: 400 });
        }

        const queue = loadTokens();
        queue.tokens.push({
            token,
            timestamp: Date.now(),
            used: false
        });
        saveTokens(queue);

        return NextResponse.json({
            success: true,
            queueSize: queue.tokens.filter(t => !t.used).length
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to add token'
        }, { status: 500 });
    }
}
