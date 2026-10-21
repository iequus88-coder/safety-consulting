"use client";

import React, { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    // 1. 메인 앱(/main)이 에러 없이 정상 작동하도록 필수 데이터(브라우저, 임시 패스권)를 백그라운드에 강제 주입
    sessionStorage.setItem("verifiedEmail", "bypass@test.com");
    sessionStorage.setItem("licenseKey", "PASS");
    sessionStorage.setItem("browserType", "chrome_whale");

    localStorage.setItem("verifiedEmail", "bypass@test.com");
    localStorage.setItem("licenseKey", "PASS");
    localStorage.setItem("browserType", "chrome_whale");

    // 2. 거추장스러운 팝업이나 클릭 없이 0.1초 만에 챗봇 화면으로 즉시 강제 직행
    window.location.href = "/main?tier=PRO";
  }, []);

  // 3. 0.1초의 찰나 동안 사용자에게 보여줄 깔끔한 로딩 화면
  return (
    <div style={{
      backgroundColor: "#f1f5f9",
      fontFamily: "'Pretendard', -apple-system, sans-serif",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      margin: 0
    }}>
      <div style={{ textAlign: "center", color: "#475569" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "10px", color: "#0f172a" }}>
          🛡️ Safety Consulting 앱
        </h2>
        <p>안전관리 AI 에이전트를 불러오는 중입니다...</p>
      </div>
    </div>
  );
}
