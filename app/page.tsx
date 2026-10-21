"use client";

import React, { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    // 1. 프리패스를 위한 가짜 인증 데이터 백그라운드 강제 세팅 (에러 방지)
    localStorage.setItem("verifiedEmail", "bypass@test.com");
    localStorage.setItem("licenseKey", "PASS");
    localStorage.setItem("browserType", "chrome_whale");

    sessionStorage.setItem("verifiedEmail", "bypass@test.com");
    sessionStorage.setItem("licenseKey", "PASS");
    sessionStorage.setItem("browserType", "chrome_whale");

    // 2. 어떠한 팝업 없이 곧바로 진짜 챗봇 화면으로 직행
    window.location.href = "/index.html";
  }, []);

  // 0.1초 찰나에 보여질 대기 화면
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f1f5f9" }}>
      <h2 style={{ color: "#0f172a", fontFamily: "sans-serif" }}>🛡️ 안전 컨설팅 앱으로 입장 중입니다...</h2>
    </div>
  );
}
