import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 98% 원본 코드를 방어하는 최외곽 독립 미들웨어
export function proxy(req: NextRequest) {
    // 1. 사용자 로그인 쿠키 확인 (Supabase Auth)
    const session = req.cookies.get('sb-access-token');

    // 2. 보호할 메인 컨설팅 경로 진입 시도 감지
    if (req.nextUrl.pathname.startsWith('/consulting') || req.nextUrl.pathname.startsWith('/api/ai')) {
        
        // 3. 미로그인 또는 인증 만료 시 즉각 튕겨냄 (원본 접근 원천 차단)
        if (!session) {
            return NextResponse.redirect(new URL('/login-gate', req.url));
        }
        
        // (여기에 DB 크레딧 잔여 횟수 조회 로직 연결)
    }

    // 4. 모든 검증을 무사히 통과한 사람만 원본 로직으로 통과
    return NextResponse.next();
}

export const config = {
    // 이 문지기가 작동할 경로만 정확히 지정
    matcher: ['/consulting/:path*', '/api/ai/:path*'], 
};