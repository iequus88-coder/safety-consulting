import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  // 1. 로그인 여부 확인
  if (!session || !session.user?.email) {
    return res.redirect('/login?error=Unauthorized');
  }

  const userEmail = session.user.email;

  try {
    // 2. 구글 시트(안전관제탑 명부) 데이터 호출 (API 연동)
    const sheetData = await fetchGoogleSheetData(); 
    
    // 3. 이메일 대조 및 구독 여부 검증
    const subscriber = sheetData.find((row) => row.email === userEmail);

    if (!subscriber) {
      return res.redirect('/login?error=NotRegistered'); // 미등록자 차단
    }

    // 4. 구독 만료일 검증
    const currentDate = new Date();
    const expireDate = new Date(subscriber.expireDate); // D열 구독만료일

    if (currentDate > expireDate) {
      return res.redirect('/login?error=Expired'); // 구독 만료 차단
    }

    /* 
      =========================================
      [PLUG-IN 창고 2] 중복 접속 및 어뷰징 차단 방패
      - 동시 접속 제한 필요 시 주석 해제 및 DB 연동
      =========================================
      const isAlreadyLoggedIn = await checkActiveSession(userEmail);
      if (isAlreadyLoggedIn) {
        return res.redirect('/login?error=MultipleLoginDetected');
      }
    */

    // 5. 검문 통과 -> 메인 앱(주방/창고)으로 진입 허가
    // 브라우저가 웨일일 경우 팝업을 띄우는 로직은 메인 진입 페이지(index.tsx)의 판독기에 위임
    res.redirect(`/main?tier=${subscriber.tier}`); // C열 권한등급(PRO, TRIAL 등) 전달

  } catch (error) {
    res.status(500).json({ message: '관제탑 통신 오류' });
  }
}

// 구글 시트 데이터 Fetch 함수 (초경량 구조)
async function fetchGoogleSheetData() {
  const sheetApiUrl = process.env.GOOGLE_SHEET_API_URL;
  const response = await fetch(sheetApiUrl as string);
  const data = await response.json();
  return data.users; // { email, tier, expireDate } 형태로 파싱된 데이터 반환
}