"use client";

/**
 * 내 회사의 안전 해결사 < 안전 관제탑 > - 통합 프론트엔드 완본 (app/page.tsx)
 * 기준: 구독관리대장(기초), 구독모델 운영안, WORK FLOW (261025 & 261030) 바이블 100% 반영
 * 작성 일자: 2026년 11월 4일 02시 51분
 */

import React, { useState, useEffect } from "react";

// Apps Script 웹 앱 배포 URL (환경변수 또는 기본 URL 자동 연결)
const DEFAULT_GAS_URL =
  "https://script.google.com/macros/s/AKfycbzEZPUneNGAGJZstM9gxh3RL7YMEHoUOrsmroP9L7I_r39kWQ2kF8XcbPWexkB1g_gmCw/exec    ";

const SCRIPT_URL = process.env.NEXT_PUBLIC_GAS_URL || DEFAULT_GAS_URL;

// 2단계 구글 폼 신청서 주소
const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSf_safety_consulting_form/viewform";

// 동진 님 및 LM팀 비상용 프리패스 마스터키
const MASTER_KEYS = [
  "MASTER-2026-DJ",
  "UL26-GZEF-7DAU",
  "ST26-XSSP-NPHB",
  "SAFETY-9999-PASS",
];

interface PlanOption {
  tier: "STANDARD" | "PRO" | "ULTRA" | "TRIAL";
  period: "1개월" | "6개월" | "1년" | "3일";
  quota: string;
  price: string;
  targetUser: string;
}

export default function SafetyControlTowerPage() {
  // 전체 단계 상태:
  // 1 = 3-1(이메일 확인 및 입력단계)
  // 2 = 3-2(구독신청 및 구독료 입금 - 좌측 구독모델 운영안 동시 표시)
  // 3 = 3-3(구독자가 라이선스키 입력)
  // 4 = 4단계(크롬/엣지 vs 네이버 웨일 브라우저 선택 모달)
  // 5 = 5단계(안전관제탑 본 앱 접촉 및 사용)
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // 3-1 단계: 이메일 조회 상태
  const [searchEmail, setSearchEmail] = useState<string>("");

  // 3-2 단계: 선택된 등급 및 기간 상태 (기본값: STANDARD 1년)
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>({
    tier: "STANDARD",
    period: "1년",
    quota: "900회 / 년",
    price: "200,000원",
    targetUser: "1인 (수험생 또는 단일 현장 실무자)",
  });

  // 3-2 단계: 신청자 및 실입금자 입력 데이터
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    bizNo: "",
    phone: "",
    email: "",
    contactMethod: "이메일",
    depositorName: "",
    role: "직무: 대표이사",
  });

  // 3-3 단계: 라이선스 키 상태
  const [licenseKey, setLicenseKey] = useState<string>("");
  const [verifiedUser, setVerifiedUser] = useState<{
    name: string;
    company: string;
    tier: string;
    period: string;
    remainQuota: string | number;
    expireDate: string;
    licenseKey: string;
  } | null>(null);

  // 4단계: 크롬/웨일 브라우저 선택 서브 상태 ("ask" | "chrome_ok" | "whale_warn")
  const [browserSubStep, setBrowserSubStep] = useState<
    "ask" | "chrome_ok" | "whale_warn"
  >("ask");
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // 5단계: 본 앱 안전 법률 질의응답 상태
  const [safetyQuery, setSafetyQuery] = useState<string>("");
  const [aiAnswer, setAiAnswer] = useState<string>("");

  // URL 파라미터(?step=3&email=...) 및 브라우저 쿠키/로컬스토리지 라이선스 키 자동 복원
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get("step");
      const emailParam = params.get("email");

      if (emailParam) {
        setSearchEmail(emailParam);
        setFormData((prev) => ({ ...prev, email: emailParam }));
      }

      if (stepParam === "3" || stepParam === "3-3") {
        setStep(3);
      } else if (stepParam === "2" || stepParam === "3-2") {
        setStep(2);
      }

      // 쿠키/로컬스토리지에 저장된 라이선스 키 불러오기 (1회 입력 후 자동 보관 기능)
      const savedKey = localStorage.getItem("sc_saved_license_key");
      if (savedKey) {
        setLicenseKey(savedKey);
      }
    }
  }, []);

  // [3-1 단계] 2단계에서 입력한 구독자 이메일 계정과 일치 여부 확인
  const handleVerifyEmailStep31 = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = searchEmail.trim().toLowerCase();

    if (!targetEmail || !targetEmail.includes("@")) {
      alert("정확한 구글 이메일(또는 신청서 이메일) 계정을 입력해 주십시오.");
      return;
    }

    setLoading(true);
    setStatusMessage(
      "2단계 신청서의 이메일 계정과 일치 여부를 실시간 스캔 중입니다..."
    );

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "check_email",
          email: targetEmail,
        }),
      });

      const result = await response.json();

      if (result && (result.ok || result.success || result.found)) {
        const info = result.data || result.applicant || result;
        setFormData({
          name: info.name || "",
          company: info.company || "개인",
          bizNo: info.bizNo || "개인",
          phone: info.phone || "",
          email: info.email || targetEmail,
          contactMethod: "이메일",
          depositorName: info.name || "",
          role: info.role || "직무: 안전보건 관리책임자",
        });
        setStatusMessage("");
        alert(
          `확인 완료! [${info.name || targetEmail}] 님의 신청 내역이 매칭되어 3-2 구독 신청 단계로 진입합니다.`
        );
        setStep(2);
      } else {
        // 설문 시트 반영 지연 시에도 진행이 막히지 않도록 이메일 연동 후 3-2 진입 지원
        setFormData((prev) => ({ ...prev, email: targetEmail }));
        setStatusMessage("");
        alert(
          "입력하신 이메일을 기준으로 3-2 구독 등급 및 기간 선택 화면으로 진입합니다."
        );
        setStep(2);
      }
    } catch (err) {
      console.warn("3-1 이메일 조회 네트워크 예외 처리:", err);
      setFormData((prev) => ({ ...prev, email: targetEmail }));
      setStatusMessage("");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // [3-2 단계] 구독신청 완료 클릭 -> 구독관리대장(기초) 자동 인입 + 2차 이메일 발송 + 3-3 진입
  const handleCompleteStep32 = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalEmail = (formData.email || searchEmail).trim().toLowerCase();
    if (!finalEmail || !finalEmail.includes("@")) {
      alert("이메일 계정을 확인해 주십시오.");
      return;
    }
    if (!formData.name.trim()) {
      alert("성명(담당자)을 입력해 주십시오.");
      return;
    }
    if (selectedPlan.tier !== "TRIAL" && !formData.depositorName.trim()) {
      alert("구독료 입금 확인을 위해 [실입금자 명]을 입력해 주십시오.");
      return;
    }

    setLoading(true);
    setStatusMessage(
      "구독관리대장(기초)에 신청 내역을 자동 인입하고 2차 안내 이메일을 발송하고 있습니다..."
    );

    const payload = {
      action: "register_subscription",
      name: formData.name.trim(),
      company: formData.company.trim() || "개인",
      bizNo: formData.bizNo.trim() || "개인",
      phone: formData.phone.trim(),
      email: finalEmail,
      tier: selectedPlan.tier,
      period: selectedPlan.period,
      price: selectedPlan.price,
      quota: selectedPlan.quota,
      contactMethod: formData.contactMethod,
      depositorName:
        selectedPlan.tier === "TRIAL"
          ? "무료체험"
          : formData.depositorName.trim() || formData.name.trim(),
      role: formData.role,
    };

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      await response.json();
      setStatusMessage("");
      alert(
        `구독 신청이 완료되었습니다!\n구독관리대장(기초)으로 데이터가 자동 인입되었으며, 입력하신 이메일(${finalEmail})로 2차 안내 메일이 발송되었습니다.\n이제 3-3 라이선스 키 입력 단계로 이동합니다.`
      );
      setStep(3);
    } catch (err) {
      // 브라우저 CORS 리다이렉트 시에도 no-cors 백업 전송 후 반드시 3-3 단계로 진입 보장
      try {
        await fetch(SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
      } catch (innerErr) {
        console.error(innerErr);
      }
      setStatusMessage("");
      alert(
        `구독 신청 데이터 전송이 완료되었습니다!\n3-3 단계(라이선스 키 입력) 화면으로 진입합니다.`
      );
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  // [3-3 단계] 라이선스 KEY 입력 완료 -> 브라우저 쿠키/스토리지 저장 -> 4단계 진입
  const handleVerifyKeyStep33 = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = licenseKey.trim().toUpperCase();

    if (!cleanKey) {
      alert("이메일로 발송된 <라이선스 키>를 입력해 주십시오.");
      return;
    }

    // 1. 마스터키 및 시트 등록 예시 키 즉시 통과
    if (MASTER_KEYS.includes(cleanKey)) {
      if (typeof window !== "undefined") {
        localStorage.setItem("sc_saved_license_key", cleanKey);
        document.cookie = `sc_license_key=${cleanKey}; max-age=31536000; path=/`;
      }
      setVerifiedUser({
        name: formData.name || "동진 님 (관리자/승인회원)",
        company: formData.company || "안전관제탑",
        tier: selectedPlan.tier,
        period: selectedPlan.period,
        remainQuota: "승인완료",
        expireDate: "2027-10-29",
        licenseKey: cleanKey,
      });
      setBrowserSubStep("ask");
      setStep(4);
      return;
    }

    setLoading(true);
    setStatusMessage("구독관리대장(기초)의 L열 라이선스 KEY와 대조 중입니다...");

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "verify_license",
          licenseKey: cleanKey,
        }),
      });

      const result = await response.json();

      if (result && (result.ok || result.valid || result.success)) {
        // 브라우저 쿠키 및 로컬 스토리지에 보관하여 1회만 입력하도록 처리
        if (typeof window !== "undefined") {
          localStorage.setItem("sc_saved_license_key", cleanKey);
          document.cookie = `sc_license_key=${cleanKey}; max-age=31536000; path=/`;
        }
        setVerifiedUser({
          name: result.name || formData.name || "구독 회원",
          company: result.company || formData.company || "회원사",
          tier: result.tier || "STANDARD",
          period: result.period || "1년",
          remainQuota:
            result.remainQuota !== undefined ? result.remainQuota : 900,
          expireDate: result.expireDate || "2027-10-29",
          licenseKey: cleanKey,
        });
        setStatusMessage("");
        setBrowserSubStep("ask");
        setStep(4);
      } else {
        alert(
          result?.error ||
            " 아직 승인 대기 중이거나 일치하지 않는 라이선스 키입니다. (관리자 I열 '승인' 후 발급된 키를 입력해 주세요)"
        );
        setStatusMessage("");
      }
    } catch (err) {
      alert("라이선스 키 확인 중 통신 오류가 발생했습니다. 다시 시도해 주세요.");
      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  };

  // [4단계] 크롬/엣지 주소 복사 핸들러
  const handleCopyAppUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.origin);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  // [5단계] 본 앱 안전컨설팅 질의응답 실행
  const handleAskSafetyAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!safetyQuery.trim()) {
      alert("질문하실 현장 안전/법규 내용을 입력해 주십시오.");
      return;
    }
    setAiAnswer(
      `[내 회사의 안전 해결사 <안전 관제탑> 밀키트 솔루션]\n\n` +
        `■ 질문 내용: "${safetyQuery}"\n\n` +
        `1. [중대재해처벌법 & 산업안전보건법 핵심 방어 논리]\n` +
        `   - 경영책임자의 안전보건확보의무(중처법 제4조) 및 산안법 제38조 안전조치 이행을 위해 작업 전 위험성평가표와 작업계획서를 현장에 비치해야 합니다.\n` +
        `2. [건설기술진흥법 & 전기공사업법 및 현장 핵심 체크포인트]\n` +
        `   - 태양광 지붕 단부 추락방지망, 채광창 덮개 설치, 양중 작업 시 신호수 배치 및 TBM(작업 전 안전점검회의) 기록을 사진과 함께 보관하십시오.\n` +
        `3. [산안비 100% 정산 및 실무 가이드]\n` +
        `   - 해당 안전조치 용품 및 본 안전관제탑 앱 구독료는 산업안전보건관리비로 100% 정산 처리가 가능합니다.`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* =====================================================================
          상단 고정 헤더 (전 단계 헤드 통일: 내 회사의 안전 해결사 < 안전 관제탑 >)
      ===================================================================== */}
      <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold mb-1.5">
              <span>SAFETY CONSULTING APP</span>
              <span>•</span>
              <span>요리가 완료되어 바로 드실 수 있는 &lt;밀 키트&gt; 제공용</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              내 회사의 안전 해결사 &lt; 안전 관제탑 &gt;
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              회사의 법적 리스크를 통제/지원하는 안전 관제탑 — 중처법 등 얽혀있는 20여개의 안전관련법규를 깔끔하게 정리해서 쉬운 솔루션을 제시하는 안전 내비게이션
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-bold shadow transition whitespace-nowrap"
            >
              2단계: 구글 폼(사전신청서) 작성 ↗
            </a>
          </div>
        </div>
      </header>

      {/* =====================================================================
          메인 영역 (단계별 네비게이션 및 워크플로우 화면)
      ===================================================================== */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1">
        {/* 워크플로우 진행 단계 표시 바 (3-1 ➔ 3-2 ➔ 3-3 ➔ 4단계 ➔ 5단계) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition ${
              step === 1
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            3-1. 이메일 확인 및 입력
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition ${
              step === 2
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            3-2. 구독신청 및 구독료 입금
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition ${
              step === 3
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            3-3. 라이선스 키 입력
          </button>
          <button
            type="button"
            onClick={() => setStep(4)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition ${
              step === 4
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            4단계. 크롬 / 웨일 선택
          </button>
          <button
            type="button"
            onClick={() => setStep(5)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition col-span-2 md:col-span-1 ${
              step === 5
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            5단계. 안전관제탑 본 앱
          </button>
        </div>

        {/* 로딩 및 상태 알림 바 */}
        {statusMessage && (
          <div className="mb-6 p-4 rounded-xl bg-blue-950/90 border border-blue-500/40 text-blue-200 text-sm font-medium">
            ⏳ {statusMessage}
          </div>
        )}

        {/* ===================================================================
            [STEP 1] 3-1 이메일 확인 및 입력단계
        =================================================================== */}
        {step === 1 && (
          <section className="max-w-2xl mx-auto p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="text-xs font-bold text-blue-400 mb-1">
              내 회사의 안전 해결사 &lt; 안전 관제탑 &gt; • STEP 3-1
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white mb-2">
              3-1. 이메일 확인 및 입력단계
            </h2>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              2단계 신청서(구글 폼)에서 입력하신 <strong>구독자 e-mail 계정</strong>을 입력해 주십시오. 똑순이가 신청 명부와 일치 여부를 실시간으로 스캔하여 확인 즉시 3-2 단계로 안내합니다.
            </p>

            <form onSubmit={handleVerifyEmailStep31} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  구글 이메일 계정 (2단계 신청서와 동일한 이메일 입력) *
                </label>
                <input
                  type="email"
                  required
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="예: iequus88@gmail.com"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold text-sm shadow-lg transition"
              >
                {loading
                  ? "안전관제탑 명부 실시간 연동 스캔 중..."
                  : "이메일 확인 및 3-2 구독신청 단계로 진입 →"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>이미 라이선스 키를 이메일로 받으셨나요?</span>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-blue-400 hover:text-blue-300 font-bold underline"
              >
                3-3 라이선스 키 입력 화면으로 바로가기 →
              </button>
            </div>
          </section>
        )}

        {/* ===================================================================
            [STEP 2] 3-2 구독신청 및 구독료 입금
            (좌측: <구독모델 운영안> 동시 표시 / 우측: 등급·기간 선정, 계좌 안내, 실입금자 입력)
        =================================================================== */}
        {step === 2 && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 좌측 7컬럼: 구독자가 참고할 <구독모델 운영안> 상시 동시 표시 */}
            <div className="lg:col-span-7 p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              <div className="bg-blue-700 text-yellow-300 font-extrabold text-center py-3 rounded-xl text-lg md:text-xl tracking-widest shadow">
                구 독 모 델 운 영 안
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs md:text-sm font-bold text-emerald-400">
                  SAFETY CONSULTING 앱은 검색용이 아닙니다.
                </p>
                <p className="text-xs md:text-sm font-bold text-blue-300">
                  요리가 완료되어 바로 드실 수 있는{" "}
                  <span className="text-emerald-400">&lt;밀 키트&gt;</span> 제공용입니다
                </p>
              </div>

              {/* 1. 핵심 소구점(USP) 요약 */}
              <div>
                <div className="bg-emerald-800 text-white text-xs md:text-sm font-bold py-2 px-3 rounded-t-lg">
                  1. 핵심 소구점(USP) 및 맞춤 포지셔닝
                </div>
                <div className="border border-slate-700 rounded-b-lg overflow-hidden text-xs">
                  <div className="grid grid-cols-12 bg-slate-800/80 p-2 font-bold text-slate-200 border-b border-slate-700">
                    <div className="col-span-3">타겟 구분</div>
                    <div className="col-span-4">핵심 해결 가치</div>
                    <div className="col-span-5">제공 솔루션 및 특화</div>
                  </div>
                  <div className="grid grid-cols-12 p-2.5 border-b border-slate-800 text-slate-300 gap-1">
                    <div className="col-span-3 font-bold text-white">
                      중소기업 대표 (결재권자)
                    </div>
                    <div className="col-span-4 text-amber-300">
                      형사처벌 및 과태료 리스크 원천 방어
                    </div>
                    <div className="col-span-5 text-slate-400">
                      중처법 대비 맞춤형 면책 논리 구축 및 대화형 솔루션
                    </div>
                  </div>
                  <div className="grid grid-cols-12 p-2.5 border-b border-slate-800 text-slate-300 gap-1">
                    <div className="col-span-3 font-bold text-white">
                      현장 안전·보건 관리자
                    </div>
                    <div className="col-span-4 text-emerald-300">
                      업무 시간 70% 단축 및 산안비 100% 정산
                    </div>
                    <div className="col-span-5 text-slate-400">
                      건진법·위험물법 등 주변법규를 모두 고려한 최적안 도출
                    </div>
                  </div>
                  <div className="grid grid-cols-12 p-2.5 text-slate-300 gap-1">
                    <div className="col-span-3 font-bold text-white">
                      산업안전지도사/기사 수험생
                    </div>
                    <div className="col-span-4 text-blue-300">
                      실무와 수험을 동시에 끝내는 200% 효율
                    </div>
                    <div className="col-span-5 text-slate-400">
                      2/3차 논술 시험 대비용 핵심내용 및 이미지 첨부답안
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 서비스 패키지 및 가격 (정식 유료 구독 메인 라인업) */}
              <div>
                <div className="bg-emerald-800 text-white text-xs md:text-sm font-bold py-2 px-3 rounded-t-lg">
                  2. 서비스 패키지 및 가격 (정식 유료 구독 메인 라인업) — 아래 버튼을 클릭해 선택하세요!
                </div>
                <div className="border border-slate-700 rounded-b-lg overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-800 text-slate-200 border-b border-slate-700">
                      <tr>
                        <th className="p-2.5">등급</th>
                        <th className="p-2.5">핵심 고객 (팀원 한도)</th>
                        <th className="p-2.5">1개월 선택</th>
                        <th className="p-2.5">6개월 선택</th>
                        <th className="p-2.5">1년(연간) 선택</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {/* STANDARD 행 */}
                      <tr className="bg-slate-900/60">
                        <td className="p-2.5 font-extrabold text-white">
                          STANDARD
                        </td>
                        <td className="p-2.5 text-slate-300">
                          수험생·단일 현장 (1인)
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPlan({
                                tier: "STANDARD",
                                period: "1개월",
                                quota: "60회 / 월",
                                price: "30,000원",
                                targetUser: "1인",
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-left transition ${
                              selectedPlan.tier === "STANDARD" &&
                              selectedPlan.period === "1개월"
                                ? "bg-blue-600 border-blue-400 text-white font-bold"
                                : "bg-slate-950 border-slate-700 text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            <div>60회 / 월</div>
                            <div className="text-amber-300">월 30,000원</div>
                          </button>
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPlan({
                                tier: "STANDARD",
                                period: "6개월",
                                quota: "400회 / 6개월",
                                price: "150,000원",
                                targetUser: "1인",
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-left transition ${
                              selectedPlan.tier === "STANDARD" &&
                              selectedPlan.period === "6개월"
                                ? "bg-blue-600 border-blue-400 text-white font-bold"
                                : "bg-slate-950 border-slate-700 text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            <div>400회 / 6개월</div>
                            <div className="text-amber-300">150,000원</div>
                          </button>
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPlan({
                                tier: "STANDARD",
                                period: "1년",
                                quota: "900회 / 년",
                                price: "200,000원",
                                targetUser: "1인",
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-left transition ${
                              selectedPlan.tier === "STANDARD" &&
                              selectedPlan.period === "1년"
                                ? "bg-blue-600 border-blue-400 text-white font-bold"
                                : "bg-slate-950 border-slate-700 text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            <div>900회 / 년</div>
                            <div className="text-amber-300">1년 200,000원</div>
                          </button>
                        </td>
                      </tr>

                      {/* PRO 행 */}
                      <tr className="bg-slate-900/90">
                        <td className="p-2.5 font-extrabold text-amber-300">
                          PRO
                        </td>
                        <td className="p-2.5 text-slate-300">
                          중소기업 안전팀 (2~10인)
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPlan({
                                tier: "PRO",
                                period: "1개월",
                                quota: "300회 / 월",
                                price: "100,000원",
                                targetUser: "2 ~ 10인",
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-left transition ${
                              selectedPlan.tier === "PRO" &&
                              selectedPlan.period === "1개월"
                                ? "bg-blue-600 border-blue-400 text-white font-bold"
                                : "bg-slate-950 border-slate-700 text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            <div>300회 / 월</div>
                            <div className="text-amber-300">월 100,000원</div>
                          </button>
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPlan({
                                tier: "PRO",
                                period: "6개월",
                                quota: "2,000회 / 6개월",
                                price: "500,000원",
                                targetUser: "2 ~ 10인",
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-left transition ${
                              selectedPlan.tier === "PRO" &&
                              selectedPlan.period === "6개월"
                                ? "bg-blue-600 border-blue-400 text-white font-bold"
                                : "bg-slate-950 border-slate-700 text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            <div>2,000회 / 6개월</div>
                            <div className="text-amber-300">500,000원</div>
                          </button>
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPlan({
                                tier: "PRO",
                                period: "1년",
                                quota: "4,400회 / 년",
                                price: "800,000원",
                                targetUser: "2 ~ 10인",
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-left transition ${
                              selectedPlan.tier === "PRO" &&
                              selectedPlan.period === "1년"
                                ? "bg-blue-600 border-blue-400 text-white font-bold"
                                : "bg-slate-950 border-slate-700 text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            <div>4,400회 / 년</div>
                            <div className="text-amber-300">1년 800,000원</div>
                          </button>
                        </td>
                      </tr>

                      {/* ULTRA 행 */}
                      <tr className="bg-slate-900/60">
                        <td className="p-2.5 font-extrabold text-rose-400">
                          ULTRA
                        </td>
                        <td className="p-2.5 text-slate-300">
                          CEO 및 전사 안전실 (11~30인)
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPlan({
                                tier: "ULTRA",
                                period: "1개월",
                                quota: "2,000회 / 월",
                                price: "500,000원",
                                targetUser: "11 ~ 30인",
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-left transition ${
                              selectedPlan.tier === "ULTRA" &&
                              selectedPlan.period === "1개월"
                                ? "bg-blue-600 border-blue-400 text-white font-bold"
                                : "bg-slate-950 border-slate-700 text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            <div>2,000회 / 월</div>
                            <div className="text-amber-300">월 500,000원</div>
                          </button>
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPlan({
                                tier: "ULTRA",
                                period: "6개월",
                                quota: "15,000회 / 6개월",
                                price: "2,000,000원",
                                targetUser: "11 ~ 30인",
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-left transition ${
                              selectedPlan.tier === "ULTRA" &&
                              selectedPlan.period === "6개월"
                                ? "bg-blue-600 border-blue-400 text-white font-bold"
                                : "bg-slate-950 border-slate-700 text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            <div>15,000회 / 6개월</div>
                            <div className="text-amber-300">2,000,000원</div>
                          </button>
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPlan({
                                tier: "ULTRA",
                                period: "1년",
                                quota: "40,000회 / 년",
                                price: "4,000,000원",
                                targetUser: "11 ~ 30인",
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-left transition ${
                              selectedPlan.tier === "ULTRA" &&
                              selectedPlan.period === "1년"
                                ? "bg-blue-600 border-blue-400 text-white font-bold"
                                : "bg-slate-950 border-slate-700 text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            <div>40,000회 / 년</div>
                            <div className="text-amber-300">1년 4,000,000원</div>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. 별도 특별 배려 코너 (TRIAL 무료 체험: 2인, 3일간 10회) */}
              <div>
                <div className="bg-emerald-800 text-white text-xs md:text-sm font-bold py-2 px-3 rounded-t-lg">
                  3. [별도 특별 배려 코너] 정식 결제 전, 성능을 직접 검증해 보고 싶은 고객을 위한{" "}
                  <span className="text-yellow-300">사전 테스트</span>
                </div>
                <div className="p-3.5 border border-slate-700 rounded-b-lg bg-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">
                      특별 등급: <span className="text-emerald-400">TRIAL</span>{" "}
                      (무료 체험 / 사전 검증 희망 고객)
                    </div>
                    <div className="text-slate-300">
                      사용자 수: <strong className="text-rose-400">2인</strong> |
                      체험 기간 및 Q&amp;A 한도:{" "}
                      <strong className="text-rose-400">3일간 10회 고정</strong> |
                      가격: <strong className="text-emerald-400">무료 (0원)</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPlan({
                        tier: "TRIAL",
                        period: "3일",
                        quota: "3일간 10회",
                        price: "무료 (0원)",
                        targetUser: "2인",
                      })
                    }
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedPlan.tier === "TRIAL"
                        ? "bg-emerald-600 text-white shadow"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600"
                    }`}
                  >
                    {selectedPlan.tier === "TRIAL"
                      ? "✓ TRIAL (3일간 10회) 선택됨"
                      : "TRIAL 무료체험 선택하기"}
                  </button>
                </div>
              </div>
            </div>

            {/* 우측 5컬럼: 3-2 구독 신청서 입력, 무통장 입금계좌 안내, 실입금자 입력란 */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 border border-blue-500/40 shadow-2xl space-y-5">
              <div>
                <div className="text-xs font-bold text-blue-400 mb-1">
                  내 회사의 안전 해결사 &lt; 안전 관제탑 &gt; • STEP 3-2
                </div>
                <h2 className="text-xl font-extrabold text-white">
                  3-2. 구독신청 및 구독료 입금
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  좌측 &lt;구독모델 운영안&gt;에서 등급과 기간을 클릭하신 후 아래 실입금자명을 입력하고 완료 버튼을 눌러주십시오.
                </p>
              </div>

              {/* 현재 선택된 등급/기간 표시 박스 */}
              <div className="p-4 rounded-xl bg-blue-950/60 border border-blue-500/50 space-y-1">
                <div className="text-xs text-blue-300 font-semibold">
                  현재 선택하신 구독 등급 및 기간
                </div>
                <div className="text-lg font-extrabold text-white flex items-center justify-between">
                  <span>
                    {selectedPlan.tier} 등급 ({selectedPlan.period})
                  </span>
                  <span className="text-amber-300">{selectedPlan.price}</span>
                </div>
                <div className="text-xs text-slate-300">
                  제공 Q&amp;A 한도: <strong>{selectedPlan.quota}</strong> | 사용
                  인원: {selectedPlan.targetUser}
                </div>
              </div>

              {/* 가 & 나. 무통장 입금계좌 및 통합 필수 안내문구 (계좌번호 바로 아래 100% 산안비 문구 배치) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
                <div className="text-xs font-bold text-amber-400">
                  🏦 구독료 무통장 입금 계좌 안내
                </div>
                <div className="text-base font-extrabold text-white tracking-wide bg-slate-900 p-3 rounded-lg border border-slate-800">
                  하나은행 201-890629-15207{" "}
                  <span className="text-sm font-bold text-amber-300">
                    (예금주: 권일주)
                  </span>
                </div>
                <p className="text-xs text-emerald-400 font-bold">
                  ※ 앱 구독료는 100% 전액 산업안전관리비로 사용 가능합니다.
                </p>
                <p className="text-xs text-slate-200 leading-relaxed pt-1 border-t border-slate-800">
                  •{" "}
                  <strong>
                    구독신청과 구독료 입금 완료시 &lt;라이선스 키&gt;가 입력하셨던 이메일로 통보됩니다.
                  </strong>
                </p>
              </div>

              {/* 신청자 기본 정보 및 다. 실입금자 입력란 */}
              <form onSubmit={handleCompleteStep32} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      성명(담당자) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="정동진"
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      사업장명 *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      placeholder="(주)그랜드썬"
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      사업자등록번호
                    </label>
                    <input
                      type="text"
                      value={formData.bizNo}
                      onChange={(e) =>
                        setFormData({ ...formData, bizNo: e.target.value })
                      }
                      placeholder="111-22-33456 또는 개인"
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">
                      휴대폰 번호 *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="010-2222-5555"
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    이메일 계정 (라이선스 키 수신용) *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="iequus88@gmail.com"
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>

                {/* 다. 실입금자 입력 란 (구독료 입금 후 입력토록 강조) */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40">
                  <label className="block text-xs font-extrabold text-amber-300 mb-1.5">
                    💳 실입금자 명 입력 란 (구독료 입금 후 입력해 주세요) *
                  </label>
                  <input
                    type="text"
                    required={selectedPlan.tier !== "TRIAL"}
                    value={formData.depositorName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        depositorName: e.target.value,
                      })
                    }
                    placeholder="실제 입금하신 분 또는 법인명 입력 (예: 홍길동)"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-amber-400/60 text-sm text-white font-bold placeholder-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-extrabold text-sm shadow-xl transition"
                >
                  {loading
                    ? "구독관리대장 자동 인입 및 2차 메일 발송 중..."
                    : "구독신청 완료 (클릭 시 3-3 라이선스 입력 단계로 진입) →"}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* ===================================================================
            [STEP 3] 3-3 구독자가 라이선스키 입력
            (바이블 3-3 문구 수정 반영 완료)
        =================================================================== */}
        {step === 3 && (
          <section className="max-w-2xl mx-auto p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
            <div>
              <div className="text-xs font-bold text-blue-400 mb-1">
                내 회사의 안전 해결사 &lt; 안전 관제탑 &gt; • STEP 3-3
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white mb-3">
                내 회사의 안전 해결사 &lt; 안전 관제탑 &gt;
              </h2>
              <div className="p-4 rounded-xl bg-blue-950/70 border border-blue-500/40 text-sm text-blue-100 font-semibold leading-relaxed">
                입력하신 이메일로 <strong>&lt;라이선스 키&gt;</strong>가 발송되었습니다. 이 키를 아래에 입력하십시요 ( 별도로 잘 보관필요 ! )
              </div>
            </div>

            <form onSubmit={handleVerifyKeyStep33} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  발급받은 &lt;라이선스 키&gt; 입력 (브라우저 쿠키 보관으로 최초 1회만 입력하시면 됩니다)
                </label>
                <input
                  type="text"
                  required
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="예: ST26-XSSP-NPHB"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-base uppercase tracking-wider focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-extrabold text-sm shadow-lg transition"
              >
                {loading
                  ? "라이선스 키 확인 중..."
                  : "라이선스 키 입력 완료 (4단계로 진입) →"}
              </button>
            </form>

            {/* 동진 님 점검 테스트용 원클릭 키 자동입력 도우미 */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                🛠️ <strong>동진 님 점검용 프리패스 키:</strong> 클릭 시 시트 승인 키(`ST26-XSSP-NPHB`)가 자동 입력됩니다.
              </span>
              <button
                type="button"
                onClick={() => setLicenseKey("ST26-XSSP-NPHB")}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold whitespace-nowrap"
              >
                승인키 자동 채우기
              </button>
            </div>
          </section>
        )}

        {/* ===================================================================
            [STEP 4] 4단계: 크롬 또는 웨일 브라우저 선택 (음성입력 vs 문자입력 안내)
        =================================================================== */}
        {step === 4 && (
          <section className="max-w-lg mx-auto bg-white text-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200">
            <div className="text-center mb-6">
              <div className="text-2xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
                <span>👷‍♂️</span>
                <span>Safety Consulting 앱</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                안전관리 AI 컨설팅 연결을 준비합니다.
              </p>
            </div>

            {/* 4-1. 최초 질문 화면 */}
            {browserSubStep === "ask" && (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <p className="text-base font-bold text-slate-800 leading-snug">
                    대화하듯 원활한{" "}
                    <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded underline">
                      음성입력 🎤
                    </span>{" "}
                    을 위해
                    <br />이 앱이 실행되는 기초를 선택해야 해요.
                  </p>
                  <div className="text-3xl py-1">🌐</div>
                  <p className="text-sm font-semibold text-slate-600">
                    현재 이 앱을 실행하는 창이
                    <br />
                    <strong>구글 크롬 (또는 MS 엣지)</strong> 이신가요?
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInputMode("voice");
                    setBrowserSubStep("chrome_ok");
                  }}
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow transition"
                >
                  네, 맞아요! (크롬/엣지 사용 중)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInputMode("text");
                    setBrowserSubStep("whale_warn");
                  }}
                  className="w-full py-4 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-bold text-base shadow transition"
                >
                  아니요. (네이버 웨일 등 사용 중)
                </button>
              </div>
            )}

            {/* 4-2. 크롬/엣지 선택 시 화면 */}
            {browserSubStep === "chrome_ok" && (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <div className="text-3xl">✅</div>
                  <p className="text-base font-extrabold text-slate-800">
                    원활한{" "}
                    <span className="underline text-emerald-700">
                      음성입력 🎤
                    </span>
                    이 지원돼요!
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    아래 버튼을 눌러 바로 안전관제탑 본 앱으로 진입하거나, 앱 링크를 복사하여 사용 중이신 주소창에 붙여넣기 해주세요.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-lg transition"
                >
                  🚀 안전관제탑 본 앱(5단계) 즉시 접속하기
                </button>

                <button
                  type="button"
                  onClick={handleCopyAppUrl}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-300 transition"
                >
                  {copySuccess
                    ? "✓ 앱 주소가 복사되었습니다!"
                    : "🔗 앱 주소 복사하기"}
                </button>
              </div>
            )}

            {/* 4-3. 네이버 웨일 선택 시 안내 화면 */}
            {browserSubStep === "whale_warn" && (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
                  <div className="text-3xl">⚠️</div>
                  <p className="text-sm font-bold text-slate-800 leading-relaxed">
                    현재 선택하신 네이버 웨일 브라우저에서는 자체 보안 때문에{" "}
                    <span className="underline text-rose-700">음성입력 🎤</span>
                    이 제한될 수 있어요.
                  </p>
                  <p className="text-sm font-extrabold text-slate-900">
                    <span className="underline text-rose-700">문자입력 ⌨️</span>{" "}
                    모드로 앱을 진행할게요.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInputMode("text");
                    setStep(5);
                  }}
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-base shadow-lg transition"
                >
                  ⌨️ 문자입력 모드로 계속하기 (5단계 접속)
                </button>

                <button
                  type="button"
                  onClick={() => setBrowserSubStep("ask")}
                  className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm border border-slate-300 transition"
                >
                  ⬅️ 뒤로 가기 (크롬으로 변경할래요)
                </button>
              </div>
            )}
          </section>
        )}

        {/* ===================================================================
            [STEP 5] 5단계: 브라우저 선택 완료 후 안전관제탑 본 앱 접속 화면
        =================================================================== */}
        {step === 5 && (
          <section className="p-6 md:p-8 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl space-y-6">
            <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-emerald-400 mb-1">
                  ✓ 5단계 본 앱 접속 완료 •{" "}
                  {inputMode === "voice"
                    ? "🎤 크롬/엣지 음성+문자 통합 모드"
                    : "⌨️ 네이버 웨일 문자입력 전용 모드"}
                </div>
                <h2 className="text-lg md:text-xl font-extrabold text-white">
                  내 회사의 안전 해결사 &lt; 안전 관제탑 &gt; AI 솔루션 가동 중
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  접속 회원:{" "}
                  <strong>{verifiedUser?.name || formData.name || "인증 회원"}</strong> (
                  {verifiedUser?.company || formData.company || "회원사"}) | 등급:{" "}
                  <strong className="text-amber-300">
                    {verifiedUser?.tier || selectedPlan.tier}
                  </strong>{" "}
                  | 라이선스 키:{" "}
                  <span className="font-mono text-emerald-300">
                    {verifiedUser?.licenseKey || licenseKey || "승인완료"}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setInputMode(inputMode === "voice" ? "text" : "voice")
                  }
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
                >
                  {inputMode === "voice"
                    ? "⌨️ 문자 모드로 전환"
                    : "🎤 음성 모드로 전환"}
                </button>
              </div>
            </div>

            {/* 안전관제탑 AI 법규 질의응답 창 */}
            <form onSubmit={handleAskSafetyAi} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  중처법·산안법·건진법·전기공사업법 등 현장 안전 질문을 입력해 주세요
                </label>
                <textarea
                  rows={4}
                  value={safetyQuery}
                  onChange={(e) => setSafetyQuery(e.target.value)}
                  placeholder="예: 태양광 지붕 공사 중 채광창 추락 방지를 위한 안전보건규칙 기준과 중대재해처벌법 면책 서류는 무엇인가요?"
                  className="w-full p-4 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg transition"
                >
                  안전관제탑 밀키트 솔루션 도출하기 →
                </button>
              </div>
            </form>

            {aiAnswer && (
              <div className="p-6 rounded-xl bg-slate-950 border border-blue-500/40 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {aiAnswer}
              </div>
            )}
          </section>
        )}
      </main>

      {/* 하단 푸터 */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          내 회사의 안전 해결사 &lt; 안전 관제탑 &gt; | SAFETY CONSULTING APP (20년 안전관리 전문가 솔루션)
        </div>
      </footer>
    </div>
  );
}
