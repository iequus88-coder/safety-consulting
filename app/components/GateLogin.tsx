"use client";

import React, { useEffect } from "react";

export default function GateLogin() {
  const MAIN_APP_URL = "/main?tier=PRO"; // 프리패스 메인 진입 경로

  // 과거 인증 기록 초기화
  useEffect(() => {
    sessionStorage.clear();
    localStorage.clear();
  }, []);

  // 4단계: 브라우저 선택 후 즉시 메인 앱으로 진입
  const proceedToMainApp = (browserChoice: string) => {
    sessionStorage.setItem("browserType", browserChoice);
    localStorage.setItem("browserType", browserChoice);
    window.location.href = MAIN_APP_URL;
  };

  return (
    <div style={{
      backgroundColor: "#f1f5f9",
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      margin: 0,
      padding: 0
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        .card-modal { background: #ffffff; width: 92%; max-width: 480px; padding: 36px 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12); text-align: center; }
        .title { margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 800; }
        .subtitle { margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6; }
        .btn-green { width: 100%; padding: 15px; background-color: #10b981; color: #ffffff; font-weight: 700; font-size: 15px; border: none; border-radius: 10px; cursor: pointer; margin-bottom: 10px; }
        .btn-gray { width: 100%; padding: 15px; background-color: #94a3b8; color: #ffffff; font-weight: 700; font-size: 15px; border: none; border-radius: 10px; cursor: pointer; }
        .badge-box { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 700; margin: 16px 0; }
      `}} />

      <div className="card-modal">
        <h2 className="title">🛡️ Safety Consulting 앱</h2>
        <p className="subtitle" style={{ marginBottom: "12px" }}>안전관리 AI 에이전트 구동을 시작합니다.</p>

        <div className="badge-box">✅ 베타 테스트 프리패스 접속이 완료되었습니다.</div>

        <p style={{ color: "#1e293b", fontSize: "15px", fontWeight: 700, lineHeight: 1.5, margin: "20px 0" }}>
          마이크를 활용한 음성인식 기능 등을 위해<br />이 앱이 실행되는 곳을 선택하여 주세요.
        </p>
        <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5, marginBottom: "24px" }}>
          현재 사용 중인 브라우저가<br /><strong>크롬(Chrome)</strong> 또는 <strong>웨일(Whale)</strong>입니까?
        </p>

        <button type="button" className="btn-green" onClick={() => proceedToMainApp("chrome_whale")}>
          네, 맞아요! (크롬/웨일 사용 중)
        </button>
        <button type="button" className="btn-gray" onClick={() => proceedToMainApp("other")}>
          아니요 (사파리/엣지 등 사용 중)
        </button>
      </div>
    </div>
  );
}
