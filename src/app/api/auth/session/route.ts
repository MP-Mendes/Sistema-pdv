import { NextResponse } from 'next/server';
import { getActiveSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getActiveSession();
    return NextResponse.json({ session });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ session: null });
  }
}
