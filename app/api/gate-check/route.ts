import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/main?tier=PRO', req.url));
}

export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/main?tier=PRO', req.url));
}
