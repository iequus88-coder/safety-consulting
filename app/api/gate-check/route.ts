import { NextRequest, NextResponse } from 'next/server';

// 동진 님의 Apps Script (안전관제탑 14-2) 웹앱 URL을 환경변수에서 가져오거나 직접 입력
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbx7mW5CWyxqpmvM2NLTMYjXLQs6PFpoYCb1qHUq72_cG9iEjEGmxSIUHk3dg3WeEX9KBw/exec';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!APPS_SCRIPT_URL) {
      return NextResponse.json(
        { valid: false, found: false, message: '서버 환경변수(APPS_SCRIPT_URL)가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // Apps Script (안전관제탑 14-2 doPost)로 요청 전달 (checkEmail, submitSubscription, verifyKey)
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(body),
      redirect: 'follow',
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, found: false, message: '관제탑 서버 통신 중 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // 누군가 주소창으로 직접 API에 접근하면 무조건 메인 관문(/)으로 돌려보냄 (무단 통과 차단)
  return NextResponse.redirect(new URL('/', req.url));
}
