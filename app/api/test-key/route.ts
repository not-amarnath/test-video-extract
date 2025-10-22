import { NextResponse } from 'next/server';

export async function GET() {
  const hasKey = !!process.env.GEMINI_API_KEY;
  return NextResponse.json({ 
    configured: hasKey,
    keyPrefix: hasKey ? process.env.GEMINI_API_KEY?.substring(0, 8) + '...' : 'N/A'
  });
}