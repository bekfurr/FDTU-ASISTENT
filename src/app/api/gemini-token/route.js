import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || "dummy_key";
  // In a real production app, verify the user session (e.g. Supabase auth)
  // before sending the API key, or use an ephemeral token if/when supported.
  return NextResponse.json({ token: apiKey });
}
