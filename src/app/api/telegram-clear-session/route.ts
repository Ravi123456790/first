import { NextResponse } from 'next/server';
import { clearUserSession } from '../telegram-session-store';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const clearedCount = clearUserSession(userId);
        
        return NextResponse.json({ 
            success: true, 
            message: 'Session cleared',
            clearedSessions: clearedCount 
        });
    } catch (error) {
        console.error('Error clearing session:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

