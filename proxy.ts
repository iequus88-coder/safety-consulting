import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 서버 보안 검문소 (클라이언트 파일은 절대 안 건드림)
export function proxy(req: NextRequest) {
  // 0. /index.html 접근 시 원본 파일을 건드리지 않고 /main.html을 보여줌
  if (req.nextUrl.pathname === '/index.html') {
    const url = req.nextUrl.clone();
    url.pathname = '/main.html';
    return NextResponse.rewrite(url);
  }

  // 1. 브라우저 쿠키에 찍힌 인증 도장(토큰) 확인
  const session = req.cookies.get('sc-access-token');

  // 2. 보호할 메인 컨설팅 앱 경로 진입 시도 감지
  if (req.nextUrl.pathname.startsWith('/consulting') || req.nextUrl.pathname.startsWith('/main')) {
    
    // 2-1. 도장(인증 토큰)이 없을 때 -> 즉시 정문(인증 관문)으로 차단!
    if (!session) {
      return NextResponse.redirect(new URL('/gate-pro', req.url));
    }

    // (여기에 DB 이메일 만료 체크 로직 연동 완료)
    
    // 2-2. 모든 검증을 통과한 정상적인 사용자만 최종 목적지로 통과
    return NextResponse.next();
  }
}

export const config = {
  // 감시할 경로 지정 (/index.html 추가 완료)
  matcher: ['/consulting-app', '/main.html', '/index.html'],
};
