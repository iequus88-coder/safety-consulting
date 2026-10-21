import { NextResponse } from 'next/server';

// GET 요청 처리 (무조건 메인 페이지로 통과)
export async function GET(request: Request) {
  const url = new URL('/main?tier=PRO', request.url);
  return NextResponse.redirect(url);
}

// POST 요청 처리 (무조건 메인 페이지로 통과)
export async function POST(request: Request) {
  const url = new URL('/main?tier=PRO', request.url);
  return NextResponse.redirect(url);
}
