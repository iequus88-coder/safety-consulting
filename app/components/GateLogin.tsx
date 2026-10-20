"use client";

import React, { useState, useEffect } from "react";

export default function GateLogin() {
  const [step, setStep] = useState(3);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPlan, setUserPlan] = useState("무료체험_30일");
  const [statusMsg, setStatusMsg] = useState("");
  const [statusColor, setStatusColor] = useState("#dc2626");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedNotice, setVerifiedNotice] = useState("");

  // ★ 구글 Apps Script 웹앱 URL (기존 입력하신 값 그대로 유지)
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwUuQ3A_fLI387i6t1Ys2CPm2ESttbl7QRaRRtZNss26PQFvpLVJGbXrOsBYJw6jFXN/exec";
  const MAIN_APP_URL = "/";

  // 1. 페이지가 열릴 때 과거 기록 때문에 3단계를 건너뛰는 현상을 100% 강제 차단
  useEffect(() => {
    sessionStorage.removeItem("verifiedEmail");
    sessionStorage.removeItem("licenseKey");
    localStorage.removeItem("verifiedEmail");
    localStorage.removeItem("licenseKey");
  }, []);

  // 2. 3단계에서 이메일 확인 버튼 클릭 시 실행
  const handleStep3Verify = async () => {
    const nameVal = userName.trim();
    const emailVal = userEmail.trim().toLowerCase();
    const planVal = userPlan;

    if (!nameVal) {
      setStatusColor("#dc2626");
      setStatusMsg("⚠️ 성명을 입력하여 주십시오.");
      return;
    }
    if (!emailVal || !emailVal.includes("@")) {
      setStatusColor("#dc2626");
      setStatusMsg("⚠️ 정확한 이메일 주소를 입력하여 주십시오.");
      return;
    }

    setStatusColor("#2563eb");
    setStatusMsg("⏳ 이메일 기준 구독 권한을 확인하고 있습니다...");
    setIsVerifying(true);

    try {
      if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("여기에_")) {
        setTimeout(() => {
          openStep4Screen(emailVal, "FREE-30-DAYS", "신규 30일 무료체험 인증 완료");
        }, 600);
        return;
      }

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          mode: "VERIFY_EMAIL_MAIN",
          name: nameVal,
          email: emailVal,
          plan: planVal
        })
      });

      const data = await response.json();

      if (data.result === "ALLOW") {
        openStep4Screen(emailVal, data.licenseKey || "PASS", data.message || "인증 완료");
      } else {
        setStatusColor("#dc2626");
        setStatusMsg("❌ " + (data.message || "이용 기간이 만료되었거나 권한이 없습니다."));
        setIsVerifying(false);
      }
    } catch (err) {
      setStatusColor("#dc2626");
      setStatusMsg("⚠️ 통신 오류가 발생했습니다. URL 주소를 확인하거나 다시 시도해 주세요.");
      setIsVerifying(false);
    }
  };

  // 3. 3단계 통과 후 4단계(브라우저 선택 화면) 열기
  const openStep4Screen = (email: string, key: string, msg: string) => {
    sessionStorage.setItem("verifiedEmail", email);
    sessionStorage.setItem("licenseKey", key);
    localStorage.setItem("verifiedEmail", email);
    localStorage.setItem("licenseKey", key);

    setVerifiedNotice(`✅ [${email}] ${msg}`);
    setStep(4);
  };

  // 4. 4단계에서 브라우저 선택 후 5단계(메인 앱)로 이동
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
        .card-modal { background: #ffffff; width: 92%; max-width: 480px; padding: 36px 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12); }
        .title { margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 800; text-align: center; }
        .subtitle { margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6; text-align: center; }
        .form-group { margin-bottom: 16px; text-align: left; }
        .form-label { display: block; font-weight: 700; margin-bottom: 6px; color: #334155; font-size: 14px; }
        .form-input, .form-select { width: 100%; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; color: #1e293b; background: #ffffff; }
        .form-input:focus, .form-select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); }
        .status-msg { font-size: 14px; font-weight: 700; text-align: center; min-height: 22px; margin: 16px 0; line-height: 1.4; }
        .btn-primary { width: 100%; padding: 15px; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 16px; border: none; border-radius: 10px; cursor: pointer; transition: background 0.2s; }
        .btn-primary:hover { background-color: #1d4ed8; }
        .btn-primary:disabled { background-color: #94a3b8; cursor: not-allowed; }
        .btn-green { width: 100%; padding: 15px; background-color: #10b981; color: #ffffff; font-weight: 700; font-size: 15px; border: none; border-radius: 10px; cursor: pointer; margin-bottom: 10px; }
        .btn-gray { width: 100%; padding: 15px; background-color: #94a3b8; color: #ffffff; font-weight: 700; font-size: 15px; border: none; border-radius: 10px; cursor: pointer; }
        .badge-box { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 700; margin: 16px 0; text-align: center; }
      `}} />

      {step === 3 && (
        <div className="card-modal">
          <h2 className="title">🔒 Safety Consulting 앱 구독신청 (3단계)</h2>
          <p className="subtitle">
            구글 폼(1단계)에서 입력하신 <strong>이메일 주소</strong>를 확인합니다.<br />
            신규 이메일은 <strong>30일 무료 체험</strong>이 즉시 시작됩니다.
          </p>

          <div className="form-group">
            <label className="form-label">성명 *</label>
            <input type="text" className="form-input" placeholder="성명을 입력하세요" value={userName} onChange={(e) => setUserName(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">이메일 주소 (인증 기준) *</label>
            <input type="email" className="form-input" placeholder="example@naver.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">구독 및 이용 플랜 선택</label>
            <select className="form-select" value={userPlan} onChange={(e) => setUserPlan(e.target.value)}>
              <option value="무료체험_30일">신규 30일 무료 체험 (또는 기존 회원 로그인)</option>
              <option value="1개월_구독">1개월 유료 구독 신청</option>
              <option value="6개월_구독">6개월 유료 구독 신청</option>
              <option value="12개월_구독">12개월 유료 구독 신청</option>
            </select>
          </div>

          <div className="status-msg" style={{ color: statusColor }}>{statusMsg}</div>

          <button type="button" className="btn-primary" onClick={handleStep3Verify} disabled={isVerifying}>
            {isVerifying ? "인증 진행 중..." : "이메일 인증 및 다음 단계(4단계)로 이동"}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="card-modal" style={{ textAlign: "center" }}>
          <h2 className="title">🛡️ Safety Consulting 앱</h2>
          <p className="subtitle" style={{ marginBottom: "12px" }}>안전관리 AI 에이전트 구동을 시작합니다.</p>

          <div className="badge-box">{verifiedNotice}</div>

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
      )}
    </div>
  );
}
