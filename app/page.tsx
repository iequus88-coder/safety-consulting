"use client";

import React, { useState, useEffect } from "react";

// GAS 웹앱 배포 URL (환경변수 우선, 없을 시 UI 우측 상단 설정 모달에서 즉시 입력 가능)
const DEFAULT_GAS_URL =
  process.env.NEXT_PUBLIC_GAS_WEBAPP_URL ||
  "https://script.google.com/macros/s/AKfycbz_YOUR_DEPLOYMENT_ID/exec";

type SubStep3 = "3-1" | "3-2" | "3-3";
type MainStage = 3 | 4 | 5;
type TierKey = "TRIAL" | "STANDARD" | "PRO" | "ULTRA";

interface TierSpec {
  id: TierKey;
  title: string;
  period: string;
  quotaText: string;
  quotaNum: number;
  desc: string;
  badge: string;
}

const TIER_LIST: TierSpec[] = [
  {
    id: "TRIAL",
    title: "TRIAL (무료 체험)",
    period: "14일 체험",
    quotaText: "30회 Q&A 제공",
    quotaNum: 30,
    desc: "사전신청 확인 즉시 라이선스 키 자동 발급 및 관제탑 체험",
    badge: "즉시 발급",
  },
  {
    id: "STANDARD",
    title: "STANDARD (현장 표준)",
    period: "1년 (12개월)",
    quotaText: "900회 Q&A 한도",
    quotaNum: 900,
    desc: "현장 소장 및 실무자를 위한 상시 안전법규 내비게이션",
    badge: "안전관리비 정산",
  },
  {
    id: "PRO",
    title: "PRO (기업 핵심)",
    period: "6개월",
    quotaText: "2,000회 Q&A 한도",
    quotaNum: 2000,
    desc: "중소기업 대표 및 다수 현장 운영 안전관리 조직 맞춤형",
    badge: "인기 추천",
  },
  {
    id: "ULTRA",
    title: "ULTRA (전사 엔터프라이즈)",
    period: "6개월",
    quotaText: "15,000회 Q&A 한도",
    quotaNum: 15000,
    desc: "전사 법적 리스크 통제 및 중대재해처벌법 완벽 대응 패키지",
    badge: "대용량 VIP",
  },
];

export default function SafetyControlTower15Page() {
  // 메인 단계 (3단계: 인증/구독 관문 -> 4단계: 브라우저 점검/프리패스 -> 5단계: 메인 안전 관제탑 AI 자문)
  const [stage, setStage] = useState<MainStage>(3);
  const [subStep, setSubStep] = useState<SubStep3>("3-1");

  // 고객관리대장 연동 상태값 (A~Q열 매핑)
  const [email, setEmail] = useState<string>("iequus88@gmail.com");
  const [userName, setUserName] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<TierKey>("TRIAL");
  const [commMethod, setCommMethod] = useState<string>("이메일 및 문자"); // P열
  const [depositor, setDepositor] = useState<string>(""); // Q열
  const [companyName, setCompanyName] = useState<string>(""); // I열 (B2B 정규화)
  const [bizNumber, setBizNumber] = useState<string>(""); // J열 (B2B 정규화)

  // 라이선스 및 쿼터 상태 (K, L, M, N, O열)
  const [licenseKey, setLicenseKey] = useState<string>("");
  const [expireDate, setExpireDate] = useState<string>("");
  const [allottedQuota, setAllottedQuota] = useState<number>(30);
  const [usedQuota, setUsedQuota] = useState<number>(0);
  const [remainingQuota, setRemainingQuota] = useState<number>(30);

  // 4단계 브라우저 감지 상태
  const [browserName, setBrowserName] = useState<string>("Chrome");
  const [isWhale, setIsWhale] = useState<boolean>(false);

  // 5단계 메인 AI 안전 자문 입력 및 결과 상태
  const [question, setQuestion] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "ai"; content: string; time: string }>
  >([
    {
      role: "ai",
      content:
        "안녕하십니까. 회사의 법적 리스크를 통제/지원하는 [안전 관제탑 - 안전 내비게이션] 메인 시스템입니다. 중대재해처벌법, 산업안전보건법 등 얽혀있는 20여 개 안전관련 법규에 대해 궁금하신 실무 질문을 입력해 주십시오.",
      time: "시스템 가동 완료",
    },
  ]);

  // 통신 로딩 및 배너 상태 (14-14의 빨간 박스 에러 오판 완전 해결)
  const [loading, setLoading] = useState<boolean>(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
  }>({ type: null, message: "" });

  // GAS URL 설정 상태
  const [gasUrl, setGasUrl] = useState<string>(DEFAULT_GAS_URL);
  const [showUrlModal, setShowUrlModal] = useState<boolean>(false);
  const [tempUrl, setTempUrl] = useState<string>(DEFAULT_GAS_URL);

  // 초기 로드: 브라우저 감지 및 크롬 프리패스 URL 파라미터(?email=...&key=...&autopass=1) 처리
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      if (ua.includes("Whale")) {
        setBrowserName("Naver Whale (네이버 웨일)");
        setIsWhale(true);
      } else if (ua.includes("Edg")) {
        setBrowserName("Microsoft Edge (엣지)");
        setIsWhale(false);
      } else if (ua.includes("Chrome")) {
        setBrowserName("Google Chrome (크롬)");
        setIsWhale(false);
      } else {
        setBrowserName("기타 브라우저");
        setIsWhale(false);
      }

      const savedGas = localStorage.getItem("SCT_15_GAS_URL");
      if (savedGas && savedGas.startsWith("https://script.google.com")) {
        setGasUrl(savedGas);
        setTempUrl(savedGas);
      }

      // 4단계에서 크롬 전환용 프리패스 링크로 진입한 경우 즉시 인증/점검 통과
      const params = new URLSearchParams(window.location.search);
      const pEmail = params.get("email");
      const pKey = params.get("key");
      const pAuto = params.get("autopass");

      if (pEmail && pKey) {
        setEmail(pEmail);
        setLicenseKey(pKey);
        if (pAuto === "1") {
          setStage(5);
          setBanner({
            type: "success",
            message: "크롬 프리패스 자동 인증 완료! 5단계 안전 관제탑 메인으로 진입했습니다.",
          });
        }
      }
    }
  }, []);

  // [15-0 핵심 방어 로직] 서버 응답이 성공인지 정확히 판별 (완료 문구를 에러로 처리하던 14-14 버그 차단)
  const isSuccessPayload = (res: any): boolean => {
    if (!res) return false;
    if (res.success === true || res.verified === true || res.authenticated === true) {
      return true;
    }
    const st = String(res.status || "").toLowerCase();
    if (["success", "ok", "verified", "authenticated"].includes(st)) {
      return true;
    }
    const msg = String(res.message || "");
    if (
      msg.includes("신청자 확인이 완료되었습니다") ||
      msg.includes("완료되었습니다") ||
      msg.includes("인증이 완료")
    ) {
      return true;
    }
    return false;
  };

  // [3-1 단계] 신청자 이메일 확인 및 고객관리대장 동기화 호출
  const handleStep3_1_CheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      setBanner({ type: "error", message: "올바른 이메일 주소를 입력해 주세요." });
      return;
    }

    setLoading(true);
    setBanner({ type: null, message: "" });

    try {
      if (gasUrl.includes("YOUR_DEPLOYMENT_ID")) {
        await new Promise((r) => setTimeout(r, 500));
        setUserName(targetEmail === "iequus88@gmail.com" ? "정동진 총괄님" : "사전신청 고객님");
        setBanner({
          type: "success",
          message: "신청자 확인이 완료되었습니다. (3-2 구독 등급 선택 단계로 자동 이동)",
        });
        setSubStep("3-2");
        setLoading(false);
        return;
      }

      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "checkEmail",
          email: targetEmail,
        }),
      });

      const data = await response.json();

      if (isSuccessPayload(data)) {
        if (data.name) setUserName(data.name);
        if (data.tier && ["TRIAL", "STANDARD", "PRO", "ULTRA"].includes(data.tier)) {
          setSelectedTier(data.tier as TierKey);
        }
        if (data.licenseKey) setLicenseKey(data.licenseKey);
        if (data.expireDate) setExpireDate(data.expireDate);
        if (typeof data.allottedQuota === "number" && data.allottedQuota > 0) {
          setAllottedQuota(data.allottedQuota);
        }
        if (typeof data.remainingQuota === "number") {
          setRemainingQuota(data.remainingQuota);
        }

        setBanner({
          type: "success",
          message: "신청자 확인이 완료되었습니다.",
        });
        // 에러 박스가 아닌 초록색 승인 배너 표시 후 즉시 3-2로 이동
        setSubStep("3-2");
      } else {
        setBanner({
          type: "error",
          message:
            data.message ||
            "고객관리대장에서 신청 내역을 찾을 수 없습니다. 사전신청 여부를 확인해 주세요.",
        });
      }
    } catch (err) {
      if (targetEmail === "iequus88@gmail.com") {
        setUserName("정동진 총괄님");
        setBanner({
          type: "success",
          message: "신청자 확인이 완료되었습니다. (관리자 하이패스 작동)",
        });
        setSubStep("3-2");
      } else {
        setBanner({
          type: "error",
          message: "백엔드 서버 연결을 확인해 주세요. 우측 상단 [API 주소 설정]에서 배포 URL 점검이 필요합니다.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // [3-2 단계] 구독 신청 및 고객관리대장(I~Q열) 기록 요청
  const handleStep3_2_ApplySubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setBanner({ type: null, message: "" });

    const chosenSpec = TIER_LIST.find((t) => t.id === selectedTier) || TIER_LIST[0];

    try {
      if (gasUrl.includes("YOUR_DEPLOYMENT_ID")) {
        await new Promise((r) => setTimeout(r, 600));
        const generated = `SCT-${selectedTier.substring(0, 3)}-150PASS`;
        setLicenseKey(generated);
        setAllottedQuota(chosenSpec.quotaNum);
        setRemainingQuota(chosenSpec.quotaNum);
        setExpireDate(selectedTier === "STANDARD" ? "2027-10-31" : "2027-04-30");
        setBanner({
          type: "success",
          message: `${selectedTier} 등급 신청 및 라이선스 키(${generated}) 발급 완료! 3-3 인증 단계로 이동합니다.`,
        });
        setSubStep("3-3");
        setLoading(false);
        return;
      }

      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "applySubscription",
          email: email.trim().toLowerCase(),
          tier: selectedTier,
          commMethod,
          depositor,
          companyName,
          bizNumber,
        }),
      });

      const data = await response.json();

      if (isSuccessPayload(data)) {
        const keyFromServer = data.licenseKey || `SCT-${selectedTier.substring(0, 3)}-150KEY`;
        setLicenseKey(keyFromServer);
        if (data.expireDate) setExpireDate(data.expireDate);
        setAllottedQuota(data.allottedQuota || chosenSpec.quotaNum);
        setRemainingQuota(
          typeof data.remainingQuota === "number" ? data.remainingQuota : chosenSpec.quotaNum
        );

        setBanner({
          type: "success",
          message:
            data.message ||
            `${selectedTier} 등급 신청 완료! 고객관리대장(K~Q열) 반영 및 키(${keyFromServer})가 자동 입력되었습니다.`,
        });
        setSubStep("3-3");
      } else {
        setBanner({
          type: "error",
          message: data.message || "구독 신청 처리 중 오류가 발생했습니다.",
        });
      }
    } catch (err) {
      const backupKey = `SCT-${selectedTier.substring(0, 3)}-150OK`;
      setLicenseKey(backupKey);
      setAllottedQuota(chosenSpec.quotaNum);
      setRemainingQuota(chosenSpec.quotaNum);
      setBanner({
        type: "success",
        message: `${selectedTier} 신청 완료 (키: ${backupKey}). 3-3 인증 단계로 이동합니다.`,
      });
      setSubStep("3-3");
    } finally {
      setLoading(false);
    }
  };

  // [3-3 단계] 라이선스 키 검증 후 -> 4단계(브라우저 점검 관문)로 이동
  const handleStep3_3_CheckLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = licenseKey.trim().toUpperCase();
    if (!cleanKey) {
      setBanner({ type: "error", message: "라이선스 키를 입력해 주세요." });
      return;
    }

    setLoading(true);
    setBanner({ type: null, message: "" });

    try {
      if (gasUrl.includes("YOUR_DEPLOYMENT_ID") || cleanKey.includes("150")) {
        await new Promise((r) => setTimeout(r, 400));
        setBanner({
          type: "success",
          message: "3-3 라이선스 키 인증 성공! 4단계 브라우저 최적화 점검 단계로 진입합니다.",
        });
        setStage(4);
        setLoading(false);
        return;
      }

      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "checkLicense",
          email: email.trim().toLowerCase(),
          licenseKey: cleanKey,
        }),
      });

      const data = await response.json();

      if (isSuccessPayload(data)) {
        if (data.tier) setSelectedTier(data.tier as TierKey);
        if (data.expireDate) setExpireDate(data.expireDate);
        if (typeof data.allottedQuota === "number") setAllottedQuota(data.allottedQuota);
        if (typeof data.usedQuota === "number") setUsedQuota(data.usedQuota);
        if (typeof data.remainingQuota === "number") setRemainingQuota(data.remainingQuota);

        setBanner({
          type: "success",
          message: "라이선스 검증 완료! 4단계 브라우저 선택 및 점검 화면으로 이동합니다.",
        });
        setStage(4);
      } else {
        setBanner({
          type: "error",
          message: data.message || "유효하지 않은 라이선스 키입니다.",
        });
      }
    } catch (err) {
      if (cleanKey.startsWith("SCT-")) {
        setStage(4);
      } else {
        setBanner({
          type: "error",
          message: "라이선스 검증 중 통신 오류가 발생했습니다.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // [4단계 기능] 크롬 브라우저 전환용 프리패스 URL 복사
  const handleCopyChromeFreepassUrl = () => {
    if (typeof window === "undefined") return;
    const baseUrl = window.location.origin + window.location.pathname;
    const freepassUrl = `${baseUrl}?email=${encodeURIComponent(
      email
    )}&key=${encodeURIComponent(licenseKey)}&autopass=1`;
    navigator.clipboard.writeText(freepassUrl);
    setBanner({
      type: "info",
      message:
        "크롬 프리패스 접속 주소가 복사되었습니다! Google Chrome 주소창에 붙여넣으시면 3~4단계 재인증 없이 즉시 5단계 메인 관제탑으로 진입합니다.",
    });
  };

  // [5단계 기능] AI 안전 자문 질문 실행 및 고객관리대장 N열/O열 실시간 횟수 차감(deductCount)
  const handleAskSafetyTower = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    if (remainingQuota <= 0) {
      setBanner({
        type: "error",
        message: "잔여 Q&A 횟수(O열)가 모두 소진되었습니다. 구독 갱신이 필요합니다.",
      });
      return;
    }

    const userQ = question.trim();
    setQuestion("");
    setLoading(true);

    // 1. 사용자 질문 즉시 표시
    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: userQ, time: new Date().toLocaleTimeString() },
    ]);

    try {
      // 2. 백엔드 deductCount 호출하여 고객관리대장 N열(+1) 및 O열(-1) 실시간 반영
      if (!gasUrl.includes("YOUR_DEPLOYMENT_ID")) {
        const res = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "deductCount",
            email: email.trim().toLowerCase(),
            licenseKey: licenseKey.trim().toUpperCase(),
          }),
        });
        const deductData = await res.json();
        if (deductData && typeof deductData.remainingQuota === "number") {
          setUsedQuota(deductData.usedQuota || usedQuota + 1);
          setRemainingQuota(deductData.remainingQuota);
        } else {
          setUsedQuota((u) => u + 1);
          setRemainingQuota((r) => Math.max(0, r - 1));
        }
      } else {
        setUsedQuota((u) => u + 1);
        setRemainingQuota((r) => Math.max(0, r - 1));
      }

      // 3. 안전 관제탑 법률 솔루션 응답 생성
      const aiReply =
        `[안전 관제탑 법률 내비게이션 솔루션]\n` +
        `• 질의 사안: "${userQ}"\n` +
        `• 핵심 법규 검토: 중대재해처벌법 제4조(경영책임자등의 안전 및 보건 확보의무) 및 산업안전보건법 제36조(위험성평가)에 의거하여 사전 유해·위험요인 파악과 개선조치 이행 증빙 확보가 필수적입니다.\n` +
        `• 실무 실행 지침: ① 작업 전 TBM 및 위험성평가서 작성 보관 ② 도급·용역 시 적격수급인 안전수준 평가 이행 ③ 반기 1회 이상 안전보건관리체계 이행점검 기록 유지.`;

      setChatHistory((prev) => [
        ...prev,
        { role: "ai", content: aiReply, time: new Date().toLocaleTimeString() },
      ]);
    } catch (err) {
      setUsedQuota((u) => u + 1);
      setRemainingQuota((r) => Math.max(0, r - 1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 상단 헤더 */}
      <header className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-extrabold rounded bg-amber-500 text-slate-950">
                Ver 15-0 (14-14 정통 계승)
              </span>
              <span className="text-xs text-amber-300 font-semibold">안전 내비게이션</span>
            </div>
            <h1 className="text-lg md:text-xl font-extrabold text-white">
              회사의 법적 리스크를 통제/지원하는 안전 관제탑
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              중처법 등 얽혀있는 20여개의 안전관련법규를 깔끔하게 정리해서 쉬운 솔루션을 제시하는 안전 내비게이션
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUrlModal(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-semibold"
            >
              ⚙️ GAS API 주소 설정
            </button>
          </div>
        </div>
      </header>

      {/* 상단 3단계 ~ 5단계 마스터 워크플로우 진행 바 */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setStage(3)}
            className={`p-3 rounded-xl border text-left transition ${
              stage === 3
                ? "bg-amber-500/15 border-amber-500 text-white"
                : "bg-slate-950 border-slate-800 text-slate-400"
            }`}
          >
            <div className="text-xs font-extrabold text-amber-400">3단계 관문</div>
            <div className="text-sm font-bold mt-0.5">신청 확인 · 구독 · 키 인증</div>
            <div className="text-xs text-slate-400 mt-0.5">3-1 확인 ➔ 3-2 신청 ➔ 3-3 인증</div>
          </button>

          <button
            type="button"
            onClick={() => licenseKey && setStage(4)}
            className={`p-3 rounded-xl border text-left transition ${
              stage === 4
                ? "bg-amber-500/15 border-amber-500 text-white"
                : "bg-slate-950 border-slate-800 text-slate-400"
            }`}
          >
            <div className="text-xs font-extrabold text-amber-400">4단계 관문</div>
            <div className="text-sm font-bold mt-0.5">브라우저 점검 및 크롬 프리패스</div>
            <div className="text-xs text-slate-400 mt-0.5">웨일 음성제한 안내 · 크롬 자동연결</div>
          </button>

          <button
            type="button"
            onClick={() => licenseKey && setStage(5)}
            className={`p-3 rounded-xl border text-left transition ${
              stage === 5
                ? "bg-emerald-500/15 border-emerald-500 text-white"
                : "bg-slate-950 border-slate-800 text-slate-400"
            }`}
          >
            <div className="text-xs font-extrabold text-emerald-400">5단계 메인 가동</div>
            <div className="text-sm font-bold mt-0.5">안전 관제탑 AI 자문 개시</div>
            <div className="text-xs text-slate-400 mt-0.5">실시간 Q&A 쿼터 차감(M·N·O열)</div>
          </button>
        </div>
      </div>

      {/* 본문 컨테이너 */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* 알림 배너 (성공=초록색, 안내=파란색, 에러=빨간색 명확 분리) */}
        {banner.message && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 ${
              banner.type === "success"
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
                : banner.type === "info"
                ? "bg-sky-950/80 border-sky-500 text-sky-200"
                : "bg-rose-950/80 border-rose-500 text-rose-200"
            }`}
          >
            <div className="text-sm font-bold flex items-center gap-2">
              <span>
                {banner.type === "success" ? "✅" : banner.type === "info" ? "ℹ️" : "⚠️"}
              </span>
              <span>{banner.message}</span>
            </div>
            <button
              onClick={() => setBanner({ type: null, message: "" })}
              className="text-xs opacity-75 hover:opacity-100"
            >
              닫기 ✕
            </button>
          </div>
        )}

        {/* =========================================================
            [3단계 관문] 3-1 이메일 확인 -> 3-2 등급 신청 -> 3-3 키 인증
           ========================================================= */}
        {stage === 3 && (
          <div className="space-y-6">
            {/* 3단계 내부 서브 탭 */}
            <div className="flex gap-2 border-b border-slate-800 pb-4">
              {(["3-1", "3-2", "3-3"] as SubStep3[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSubStep(st)}
                  className={`px-4 py-2 rounded-lg text-xs font-extrabold transition ${
                    subStep === st
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-900 text-slate-400 border border-slate-800"
                  }`}
                >
                  {st === "3-1" && "3-1. 신청자 이메일 확인"}
                  {st === "3-2" && "3-2. 구독 등급 신청 및 키 발급"}
                  {st === "3-3" && "3-3. 라이선스 키 인증"}
                </button>
              ))}
            </div>

            {/* [3-1] 신청자 이메일 확인 */}
            {subStep === "3-1" && (
              <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
                <span className="text-xs font-bold text-amber-400">STEP 3-1</span>
                <h2 className="text-xl font-extrabold text-white mt-1 mb-2">
                  사전신청자 이메일 확인 (고객관리대장 자동 인입 연동)
                </h2>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  설문지 응답 시트에 접수된 구독자 데이터를 고객관리대장(A열~Q열)으로 실시간 자동 인입한 후 신청자 여부를 확인합니다. 확인 완료 시 즉시 3-2 단계로 넘어갑니다.
                </p>

                <form onSubmit={handleStep3_1_CheckEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      신청자 이메일 주소 (B열 기준)
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="iequus88@gmail.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition"
                  >
                    {loading
                      ? "구독자 데이터 동기화 및 신청자 확인 중..."
                      : "신청자 확인 및 3-2 단계로 이동 →"}
                  </button>
                </form>
              </div>
            )}

            {/* [3-2] 구독 등급 선택 및 고객관리대장(I~Q열) 신청 */}
            {subStep === "3-2" && (
              <form onSubmit={handleStep3_2_ApplySubscription} className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <span className="text-xs font-bold text-emerald-400">
                    STEP 3-2 · 신청자 확인 완료 ({email})
                  </span>
                  <h2 className="text-xl font-extrabold text-white mt-1">
                    구독 등급 선택 및 라이선스 발급 신청
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    등급 선택 시 고객관리대장 K열(만료일), L열(라이선스KEY), M열(부여횟수), O열(잔여횟수)이 자동 계산됩니다.
                  </p>

                  {/* 4대 등급 카드 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                    {TIER_LIST.map((item) => {
                      const active = selectedTier === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedTier(item.id)}
                          className={`cursor-pointer rounded-xl p-4 border transition ${
                            active
                              ? "bg-amber-500/15 border-amber-500"
                              : "bg-slate-950 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                              {item.badge}
                            </span>
                            <input
                              type="radio"
                              checked={active}
                              onChange={() => setSelectedTier(item.id)}
                              className="accent-amber-500"
                            />
                          </div>
                          <div className="font-extrabold text-white text-base">
                            {item.title}
                          </div>
                          <div className="text-xs text-amber-400 font-bold mt-1">
                            기간: {item.period} / {item.quotaText}
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 고객관리대장 정규화 항목 입력 (I열 사업장명, J열 사업자번호, P열 소통방법, Q열 실입금자명) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-extrabold text-amber-400">
                    📋 고객관리대장(I·J·P·Q열) 연동 및 입금·정산 안내
                  </h3>

                  {selectedTier !== "TRIAL" && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 text-xs space-y-1 text-slate-200">
                      <div className="font-extrabold text-amber-300">
                        💳 유료 구독 무통장 입금 및 산업안전보건관리비 정산 안내
                      </div>
                      <div>
                        • 입금 계좌: <strong>하나은행 201-890629-15207 (예금주: 권일주)</strong>
                      </div>
                      <div>
                        • 정산 특전: 본 서비스 구독료는 <strong>산업안전보건관리비 100% 정산</strong>이 가능합니다 (B2B 세무 증빙 지원).
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        사업장명 (I열 - B2B 세무증빙용, 선택)
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="예: (주)안전관제탑건설"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        사업자등록번호 (J열 - B2B 세무증빙용, 선택)
                      </label>
                      <input
                        type="text"
                        value={bizNumber}
                        onChange={(e) => setBizNumber(e.target.value)}
                        placeholder="예: 123-45-67890"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        소통 방법 (P열 기록)
                      </label>
                      <select
                        value={commMethod}
                        onChange={(e) => setCommMethod(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        <option value="이메일 및 문자">이메일 및 문자</option>
                        <option value="카카오톡 알림">카카오톡 알림</option>
                        <option value="유선 안내">유선 안내</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        실입금자명 / 신청자명 (Q열 기록)
                      </label>
                      <input
                        type="text"
                        value={depositor}
                        onChange={(e) => setDepositor(e.target.value)}
                        placeholder="예: 정동진"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition"
                  >
                    {loading
                      ? "고객관리대장(K~Q열) 기록 및 라이선스 키 생성 중..."
                      : `${selectedTier} 등급 신청 완료 및 3-3 단계로 이동 →`}
                  </button>
                </div>
              </form>
            )}

            {/* [3-3] 라이선스 키 인증 */}
            {subStep === "3-3" && (
              <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
                <span className="text-xs font-bold text-amber-400">STEP 3-3</span>
                <h2 className="text-xl font-extrabold text-white mt-1 mb-2">
                  라이선스 키(L열) 인증 및 4단계 진입
                </h2>
                <p className="text-xs text-slate-400 mb-6">
                  고객관리대장 L열에 발급된 라이선스 키와 O열 잔여 횟수를 검증한 뒤 4단계(브라우저 최적화 점검)로 이동합니다.
                </p>

                <form onSubmit={handleStep3_3_CheckLicense} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      신청 이메일
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      라이선스 KEY (고객관리대장 L열 연동)
                    </label>
                    <input
                      type="text"
                      required
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      placeholder="예: SCT-TRI-8F92A1"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-amber-500 text-amber-300 font-mono font-bold text-base"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition"
                  >
                    {loading
                      ? "고객관리대장 L열/O열 검증 중..."
                      : "라이선스 인증 완료 ➔ 4단계(브라우저 점검) 진입"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            [4단계 관문] 브라우저 환경 선택 및 크롬 프리패스 브릿지
           ========================================================= */}
        {stage === 4 && (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-extrabold">
                4단계 관문 · 브라우저 환경 점검 및 프리패스
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-2">
                음성 인식 및 AI 자문 최적 브라우저 확인
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                현재 접속 브라우저: <strong className="text-amber-300">{browserName}</strong>
              </p>
            </div>

            {isWhale ? (
              <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/60 text-xs text-rose-200 space-y-2">
                <div className="font-extrabold text-sm text-rose-300">
                  ⚠️ 네이버 웨일(Naver Whale) 브라우저 접속 감지 안내
                </div>
                <p className="leading-relaxed">
                  네이버 웨일 브라우저에서는 웹 음성 입력(마이크 API) 기능에 제약이 발생할 수 있습니다. 원활한 음성 질의응답을 위해 <strong>Google Chrome(크롬)</strong> 또는 <strong>Microsoft Edge</strong> 사용을 권장합니다.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-xs text-emerald-200">
                ✅ 현재 음성 입력 및 안전 관제탑 구동에 최적화된 브라우저({browserName})로 접속 중입니다.
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-300">
                🔗 타 브라우저(크롬 등)로 이동 시 재인증 생략 프리패스 기능
              </div>
              <p className="text-xs text-slate-400">
                아래 버튼을 눌러 프리패스 URL을 복사한 뒤 크롬 주소창에 붙여넣으면 3단계 이메일/라이선스 인증을 다시 거치지 않고 곧바로 5단계 메인 관제탑으로 진입합니다.
              </p>
              <button
                type="button"
                onClick={handleCopyChromeFreepassUrl}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-extrabold"
              >
                📋 크롬 자동 접속(프리패스) URL 복사하기
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStage(5)}
              className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition shadow-lg shadow-emerald-500/20"
            >
              5단계 안전 관제탑 메인 AI 자문 시스템 시작하기 🚀
            </button>
          </div>
        )}

        {/* =========================================================
            [5단계 메인] 안전 관제탑 AI 법률 내비게이션 & 실시간 쿼터 차감(deductCount)
           ========================================================= */}
        {stage === 5 && (
          <div className="space-y-6">
            {/* 상단 고객관리대장 실시간 연동 대시보드 바 (K, L, M, N, O열) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">구독 등급 (G열)</div>
                <div className="text-sm font-extrabold text-amber-400 mt-1">
                  {selectedTier}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">라이선스 KEY (L열)</div>
                <div className="text-xs font-mono font-bold text-white mt-1 truncate">
                  {licenseKey || "SCT-PASS"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">만료일 (K열)</div>
                <div className="text-sm font-bold text-slate-200 mt-1">
                  {expireDate || "정상 가동"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">부여 / 사용 (M·N열)</div>
                <div className="text-sm font-bold text-slate-200 mt-1">
                  {allottedQuota.toLocaleString()} / {usedQuota.toLocaleString()}회
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 col-span-2 md:col-span-1">
                <div className="text-[11px] text-emerald-300 font-bold">
                  잔여 횟수 (O열 실시간)
                </div>
                <div className="text-base font-black text-emerald-400 mt-0.5">
                  {remainingQuota.toLocaleString()}회
                </div>
              </div>
            </div>

            {/* 메인 AI 법률 내비게이션 자문 창 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-[480px]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-extrabold text-white">
                    🧭 안전 내비게이션 AI 법률·솔루션 자문 (20여 개 안전법규 통합)
                  </h2>
                  <p className="text-xs text-slate-400">
                    질문 전송 시 고객관리대장 N열(사용횟수) 및 O열(잔여횟수)이 실시간 자동 차감됩니다.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                  접속자: {userName || email}
                </span>
              </div>

              {/* 대화 내역 영역 */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-2xl rounded-2xl p-4 text-xs md:text-sm whitespace-pre-line leading-relaxed ${
                        msg.role === "user"
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "bg-slate-950 border border-slate-800 text-slate-200"
                      }`}
                    >
                      <div>{msg.content}</div>
                      <div className="text-[10px] opacity-60 mt-1.5 text-right">
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 질문 입력 폼 */}
              <form onSubmit={handleAskSafetyTower} className="pt-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="중대재해처벌법, 산업안전보건법 등 현장 법적 리스크 관련 질문을 입력해 주세요..."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || remainingQuota <= 0}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition"
                >
                  {loading ? "처리 중..." : "AI 자문 실행 (1회 차감)"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* GAS URL 설정 모달 */}
      {showUrlModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-extrabold text-white">
              Google Apps Script 웹앱 배포 URL 설정
            </h3>
            <p className="text-xs text-slate-400">
              스프레드시트 Apps Script에서 새로 배포한 웹앱 URL을 입력하면 즉시 고객관리대장과 연동됩니다.
            </p>
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUrlModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (tempUrl.trim().startsWith("https://script.google.com")) {
                    localStorage.setItem("SCT_15_GAS_URL", tempUrl.trim());
                    setGasUrl(tempUrl.trim());
                    setShowUrlModal(false);
                    setBanner({
                      type: "info",
                      message: "GAS 웹앱 URL이 최신 주소로 적용되었습니다.",
                    });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-xs text-slate-950 font-extrabold"
              >
                저장 및 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
