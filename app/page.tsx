"use client";

import React, { useState, useEffect } from "react";

// [중요] Apps Script 새 배포 후 발급된 웹 앱 URL을 아래에 넣거나 Vercel 환경변수(NEXT_PUBLIC_GAS_URL)에 등록하세요.
const DEFAULT_GAS_URL =
" https://script.google.com/macros/s/AKfycbwRoE60EyC19CMIv7kK9VuwYcEOBCcmxFUMlYj0PrmEXv5DgsR1NgIjow8HY0hL_eMx/exec ";

const SCRIPT_URL = process.env.NEXT_PUBLIC_GAS_URL || DEFAULT_GAS_URL;

// 비상용 라이선스 마스터키 (서버 통신 없이도 즉시 통과 보장)
const EMERGENCY_MASTER_KEYS = [
  "MASTER-2026-DJ",
  "SAFETY-9999-PASS",
  "ADMIN-PASS-2026",
];

interface ApplicantInfo {
  name: string;
  company: string;
  bizNo: string;
  phone: string;
  email: string;
  role: string;
  tier: string;
  period: string;
  status?: string;
  licenseKey?: string;
}

export default function SafetyConsultingApp() {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Step 1: 신청 내역 조회용 상태
  const [searchEmail, setSearchEmail] = useState<string>("");
  const [applicant, setApplicant] = useState<ApplicantInfo | null>(null);

  // Step 2: 플랜 및 기간 선택 상태 (TRIAL은 3일/10회 고정)
  const [selectedTier, setSelectedTier] = useState<string>("PRO");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("1년");
  const [selectedPrice, setSelectedPrice] = useState<string>("800,000원");
  const [selectedQuota, setSelectedQuota] = useState<string>("연간 4,400회 Q&A 한도");

  // Step 2: 신청서 확인 및 수정 폼
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    bizNo: "",
    phone: "",
    email: "",
    role: "대표이사",
    contactMethod: "이메일",
    depositorName: "",
  });

  // Step 3: 라이선스 인증 상태
  const [inputLicenseKey, setInputLicenseKey] = useState<string>("");
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);

  // 조회된 신청자 정보를 Step 2 입력 폼에 동기화
  useEffect(() => {
    if (applicant) {
      setFormData((prev) => ({
        ...prev,
        name: applicant.name || prev.name,
        company: applicant.company || prev.company,
        bizNo: applicant.bizNo || prev.bizNo,
        phone: applicant.phone || prev.phone,
        email: applicant.email || searchEmail,
        role: applicant.role || "대표이사",
        depositorName: applicant.name || prev.depositorName,
      }));
    }
  }, [applicant, searchEmail]);

  // 등급 및 기간 선택 핸들러
  const handlePlanSelect = (tier: string, period: string, price: string, quota: string) => {
    setSelectedTier(tier);
    setSelectedPeriod(period);
    setSelectedPrice(price);
    setSelectedQuota(quota);
  };

  // [3-1 단계] 설문지 신청자 이메일 조회
  const handleCheckApplicant = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = searchEmail.trim();
    if (!targetEmail) {
      alert("조회할 이메일을 입력해주세요.");
      return;
    }

    setLoading(true);
    setStatusMessage("설문 응답 시트에서 신청 내역을 조회 중...");

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "check_applicant",
          email: targetEmail,
        }),
      });

      const result = await response.json();
      if (result.ok && result.found && result.applicant) {
        setApplicant(result.applicant);
        setStep(2);
      } else {
        // 설문지에 없더라도 수동 입력으로 3-2 진행이 가능하도록 처리
        const proceed = window.confirm(
          "설문 응답 시트에서 해당 이메일을 찾지 못했습니다.\n직접 정보를 입력하여 3-2 단계로 이동하시겠습니까?"
        );
        if (proceed) {
          setFormData((prev) => ({ ...prev, email: targetEmail }));
          setStep(2);
        }
      }
    } catch (err) {
      console.error("조회 오류:", err);
      // 네트워크 오류 시에도 테스트가 막히지 않게 3-2 진입 허용
      setFormData((prev) => ({ ...prev, email: targetEmail }));
      setStep(2);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // [3-2 단계] 관리대장 (기초) 데이터 전송 및 즉시 3-3 이동 (허들 완전 제거)
  const handleRegisterSubscription = async () => {
    if (!formData.email.trim()) {
      alert("신청 이메일(F열 기준)을 확인해주세요.");
      return;
    }

    setLoading(true);
    setStatusMessage("관리대장 (기초)로 신청 데이터를 전송하고 있습니다...");

    const payload = {
      action: "register_subscription",
      email: formData.email.trim(),
      name: formData.name.trim() || "신청자",
      company: formData.company.trim() || "미기재 사업장",
      bizNo: formData.bizNo.trim(),
      phone: formData.phone.trim(),
      role: formData.role.trim(),
      tier: selectedTier,
      period: selectedPeriod,
      price: selectedPrice,
      contactMethod: formData.contactMethod,
      depositorName: formData.depositorName.trim() || formData.name.trim(),
    };

    try {
      // 1차: 표준 JSON/text POST 전송 (Apps Script CORS 호환)
      await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn("표준 전송 경고 (no-cors 재시도 진행):", err);
      try {
        // 2차: 브라우저 CORS 차단 시에도 구글 시트에 데이터가 무조건 도달하도록 no-cors 백업 전송
        await fetch(SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
      } catch (e2) {
        console.error("백업 전송 오류:", e2);
      }
    } finally {
      setLoading(false);
      setStatusMessage("");
      // 어떤 응답 지연이나 CORS 허들이 있더라도 3-3 단계로 즉시 이동
      setStep(3);
    }
  };

  // [3-3 단계] 라이선스 키 인증 (비상용 마스터키 우선 통과)
  const handleVerifyLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = inputLicenseKey.trim().toUpperCase();

    if (!trimmedKey) {
      alert("라이선스 키를 입력해주세요.");
      return;
    }

    // 1. 비상용 마스터키 검사 (입력 즉시 100% 통과)
    if (EMERGENCY_MASTER_KEYS.includes(trimmedKey)) {
      setAuthSuccess(true);
      return;
    }

    setLoading(true);
    setStatusMessage("라이선스 키 승인 여부를 확인 중입니다...");

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "verify_license",
          email: formData.email.trim() || searchEmail.trim(),
          key: trimmedKey,
        }),
      });

      const result = await response.json();
      if (result.ok && result.valid) {
        setAuthSuccess(true);
      } else {
        alert(
          result.error ||
            "아직 승인되지 않았거나 유효하지 않은 키입니다. (비상 시 마스터키 MASTER-2026-DJ 사용 가능)"
        );
      }
    } catch (err) {
      console.error("라이선스 검증 오류:", err);
      alert(
        "서버 통신 중 오류가 발생했습니다. 우측 하단의 [비상용 마스터키 자동 입력] 버튼을 눌러 즉시 통과할 수 있습니다."
      );
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 sm:p-8">
      {/* 상단 타이틀 헤더 */}
      <header className="w-full max-w-4xl text-center my-6">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-blue-400 mb-2">
          회사의 법적 리스크를 통제/지원하는 안전 관제탑
        </h1>
        <p className="text-slate-300 text-xs sm:text-base">
          중처법 등 얽혀있는 20여개의 안전관련법규를 깔끔하게 정리해서 쉬운 솔루션을 제시하는 안전 내비게이션
        </p>
      </header>

      {/* 메인 카드 컨테이너 */}
      <main className="w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 sm:p-8">
        {/* 상단 단계 네비게이션 탭 (클릭 시 단계 강제 이동도 가능하도록 개방) */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`font-semibold pb-1 ${
              step === 1 ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            3-1. 신청 내역 조회
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`font-semibold pb-1 ${
              step === 2 ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            3-2. 플랜 선택 및 신청 완료
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`font-semibold pb-1 ${
              step === 3 ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            3-3. 라이선스 키 인증
          </button>
        </div>

        {/* ==================== [3-1 단계] ==================== */}
        {step === 1 && (
          <section className="py-4">
            <h2 className="text-xl font-bold mb-3 text-white">3-1. 사전 설문 접수 이메일 조회</h2>
            <p className="text-sm text-slate-300 mb-6">
              구글 설문지에서 작성하신 이메일을 입력하시면 3-2 신청서 칸에 정보가 자동으로 채워집니다.
            </p>
            <form onSubmit={handleCheckApplicant} className="flex flex-col gap-4 max-w-md mx-auto">
              <input
                type="email"
                required
                placeholder="신청하신 이메일 입력 (예: inopic755@gmail.com)"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
              >
                {loading ? statusMessage || "조회 중..." : "신청 내역 불러오기 및 3-2 이동 →"}
              </button>
            </form>
          </section>
        )}

        {/* ==================== [3-2 단계] ==================== */}
        {step === 2 && (
          <section className="space-y-6">
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* TRIAL (3일 / 10회 고정) */}
                <button
                  type="button"
                  onClick={() => handlePlanSelect("TRIAL", "3일", "0원 (무료)", "3일 / 10회 고정")}
                  className={`p-4 border rounded-lg text-left transition ${
                    selectedTier === "TRIAL"
                      ? "border-amber-400 bg-slate-700/70"
                      : "border-slate-700 bg-slate-900/50"
                  }`}
                >
                  <div className="text-xs text-slate-400 mb-1">사전 검토 특전</div>
                  <div className="font-bold text-sm text-white">TRIAL (무료 체험)</div>
                  <div className="text-xs text-slate-300 mt-2">• 3일 / 10회 고정</div>
                </button>

                {/* STANDARD */}
                <button
                  type="button"
                  onClick={() => handlePlanSelect("STANDARD", "1년", "300,000원", "1년 (900회)")}
                  className={`p-4 border rounded-lg text-left transition ${
                    selectedTier === "STANDARD"
                      ? "border-amber-400 bg-slate-700/70"
                      : "border-slate-700 bg-slate-900/50"
                  }`}
                >
                  <div className="text-xs text-slate-400 mb-1">1인 실무자 / 수험생</div>
                  <div className="font-bold text-sm text-white">STANDARD (현장 표준)</div>
                  <div className="text-xs text-slate-300 mt-2">단일 현장 실무자 전용 (1인)</div>
                </button>

                {/* PRO */}
                <button
                  type="button"
                  onClick={() => handlePlanSelect("PRO", "1년", "800,000원", "1년 (4,400회)")}
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    selectedTier === "PRO"
                      ? "border-amber-400 bg-slate-700/80"
                      : "border-slate-700 bg-slate-900/50"
                  }`}
                >
                  <div className="text-xs text-amber-400 font-bold mb-1">인기 추천 (2~10인)</div>
                  <div className="font-bold text-sm text-white">PRO (기업 핵심)</div>
                  <div className="text-xs text-slate-300 mt-2">중소기업 대표 및 안전관리팀 (2~10인)</div>
                </button>

                {/* ULTRA */}
                <button
                  type="button"
                  onClick={() => handlePlanSelect("ULTRA", "1년", "800,000원", "연간 4,400회 이상")}
                  className={`p-4 border rounded-lg text-left transition ${
                    selectedTier === "ULTRA"
                      ? "border-blue-400 bg-slate-700/70"
                      : "border-slate-700 bg-slate-900/50"
                  }`}
                >
                  <div className="text-xs text-purple-400 font-bold mb-1">대용량 VIP (11~30인)</div>
                  <div className="font-bold text-sm text-white">ULTRA (전사 엔터프라이즈)</div>
                  <div className="text-xs text-slate-300 mt-2">CEO 및 전사 안전관리팀 법적 리스크 통제</div>
                </button>
              </div>
            </div>

            {/* PRO 세부 기간 선택 */}
            {selectedTier === "PRO" && (
              <div className="bg-slate-900/60 border border-slate-700 p-4 rounded-lg">
                <div className="text-xs font-bold text-amber-300 mb-3">
                  ■ [{selectedTier}] 구독 기간 및 Q&amp;A 한도 선택 (6개월·연결 약정 할인)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePlanSelect("PRO", "1개월", "100,000원", "월간 300회 Q&A 한도")}
                    className={`p-3 border rounded-lg text-xs font-bold flex justify-between items-center ${
                      selectedPeriod === "1개월"
                        ? "border-blue-400 bg-blue-900/40 text-white"
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    <span>1개월 (월간 300회 Q&amp;A 한도)</span>
                    <span className="text-blue-300">100,000원</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanSelect("PRO", "6개월", "500,000원", "6개월 2,000회 Q&A 한도")}
                    className={`p-3 border rounded-lg text-xs font-bold flex justify-between items-center ${
                      selectedPeriod === "6개월"
                        ? "border-blue-400 bg-blue-900/40 text-white"
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    <span>6개월 (6개월 2,000회 Q&amp;A 한도)</span>
                    <span className="text-blue-300">500,000원</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanSelect("PRO", "1년", "800,000원", "1년 (4,400회)")}
                    className={`p-3 border-2 rounded-lg text-xs font-bold flex justify-between items-center ${
                      selectedPeriod === "1년"
                        ? "border-blue-400 bg-blue-900/50 text-white"
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    <span>1년 (연간 4,400회 Q&amp;A 한도)</span>
                    <span className="text-blue-300">800,000원</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2단계 설문지 연동 정보 확인 폼 */}
            <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-5 space-y-4">
              <div className="text-xs sm:text-sm font-bold text-amber-200">
                ■ 2단계 신청서(구글 설문지) 자동 연동 정보 확인 (수정 가능)
              </div>

              <div className="bg-slate-800/90 border border-slate-600 p-3 rounded text-xs text-slate-200 space-y-1">
                <p>• 입금 계좌: 하나은행 201-890629-15207 (예금주: 권일주) / 결제 금액: {selectedPrice}</p>
                <p>
                  • 정산 특전: 본 서비스 구독료는 산업안전보건관리비 100% 정산이 가능합니다 (입금 확인 및 승인 후 전자세금계산서 별도 송부).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">성명/담당자 (B열 자동인입)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">사업장명 (C열 자동인입)</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">사업자등록번호 (D열 자동인입)</label>
                  <input
                    type="text"
                    value={formData.bizNo}
                    onChange={(e) => setFormData({ ...formData, bizNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">휴대폰 번호 (E열 자동인입)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">신청 이메일 (F열 기준)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">선택 등급/기간 (G·H열)</label>
                  <input
                    type="text"
                    readOnly
                    value={`${selectedTier} / ${selectedPeriod} (${selectedQuota})`}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-amber-300"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">주 소통 방법 (P열 기록)</label>
                  <select
                    value={formData.contactMethod}
                    onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                  >
                    <option value="이메일">이메일</option>
                    <option value="휴대폰(문자/카톡)">휴대폰(문자/카톡)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">실입금자명 (Q열 기록)</label>
                  <input
                    type="text"
                    value={formData.depositorName}
                    onChange={(e) => setFormData({ ...formData, depositorName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                  />
                </div>
              </div>
            </div>

            {/* 3-2 완료 및 3-3 이동 버튼 */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleRegisterSubscription}
                disabled={loading}
                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold py-4 px-6 rounded-lg transition text-base shadow-lg"
              >
                {loading
                  ? statusMessage || "관리대장 전송 중..."
                  : `${selectedTier} (${selectedPeriod}) 신청 완료 및 3-3 단계로 이동`}
              </button>
            </div>
          </section>
        )}

        {/* ==================== [3-3 단계] ==================== */}
        {step === 3 && (
          <section className="text-center py-4 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-white">3-3. 라이선스 키 인증</h2>
              <p className="text-sm text-slate-300 max-w-lg mx-auto">
                구독관리대장(기초) I열에서 관리자가 <span className="text-amber-300 font-bold">&apos;승인&apos;</span>으로
                변경하면 이메일로 라이선스 키가 발송됩니다.
              </p>
            </div>

            {authSuccess ? (
              <div className="bg-emerald-950/70 border-2 border-emerald-500 rounded-xl p-6 max-w-md mx-auto space-y-4">
                <div className="text-emerald-400 font-extrabold text-xl">
                  ✓ 라이선스 인증 완료!
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  정상 승인되었습니다. 이제 Safety Consulting 안전관제탑의 모든 법률 진단 기능을 사용하실 수 있습니다.
                </p>
                <a
                  href="/consulting"
                  className="inline-block w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-3 px-6 rounded-lg text-sm transition"
                >
                  안전관제탑 메인 솔루션 시작하기 →
                </a>
              </div>
            ) : (
              <form onSubmit={handleVerifyLicense} className="max-w-md mx-auto space-y-4">
                <input
                  type="text"
                  required
                  placeholder="라이선스 키 입력 (예: ST26-PRXXXX)"
                  value={inputLicenseKey}
                  onChange={(e) => setInputLicenseKey(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-center text-lg tracking-wider uppercase focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? statusMessage || "인증 확인 중..." : "라이선스 키 인증 및 앱 시작"}
                </button>

                {/* 비상용 마스터키 원클릭 박스 */}
                <div className="mt-6 pt-4 border-t border-slate-700 text-left bg-slate-900/80 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-400">
                      🔑 관리자 비상용 라이선스 마스터키
                    </span>
                    <button
                      type="button"
                      onClick={() => setInputLicenseKey("MASTER-2026-DJ")}
                      className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded font-semibold"
                    >
                      마스터키 자동 입력
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    • 비상 마스터키: <code className="text-amber-200 font-mono">MASTER-2026-DJ</code> 또는{" "}
                    <code className="text-amber-200 font-mono">SAFETY-9999-PASS</code>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    • 이메일 발송 지연이나 시트 연동 점검 시 위 버튼을 누르고 인증을 누르면 즉시 통과됩니다.
                  </p>
                </div>
              </form>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
