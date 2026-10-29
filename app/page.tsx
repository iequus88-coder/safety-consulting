'use client';

import React, { useState } from 'react';

// Apps Script 백엔드 배포 웹앱 URL (환경변수 미설정 시 기본 백엔드 주소로 대체)
const GAS_WEB_APP_URL = process.env.NEXT_PUBLIC_GAS_URL || 'https://script.google.com/macros/s/AKfycbwPqC208gV9Z5Yw264K8U_1eUeT-uB5b9G-fGg3rT5yZ/exec';

// 바이블 구독모델 운영안 V1.2 완벽 반영 데이터 테이블
const BIBLE_PLANS: Record<string, {
  label: string;
  target: string;
  users: string;
  periods: Record<string, { quota: number; price: number; display: string }>;
}> = {
  STANDARD: {
    label: 'STANDARD (수험생 또는 단일 현장 실무자 - 1인)',
    target: '수험생 또는 단일 현장 실무자',
    users: '1인',
    periods: {
      '1년': { quota: 900, price: 200000, display: '1년 (연간 900회 제공 / 200,000원)' },
      '6개월': { quota: 400, price: 150000, display: '6개월 (6개월 400회 제공 / 150,000원)' },
      '1개월': { quota: 60, price: 30000, display: '1개월 (월간 60회 제공 / 30,000원)' },
    },
  },
  PRO: {
    label: 'PRO (중소기업 건설/제조 안전관리팀 - 2~10인)',
    target: '중소기업 (건설/제조) 안전관리팀',
    users: '2 ~ 10인',
    periods: {
      '1년': { quota: 4400, price: 800000, display: '1년 (연간 4,400회 제공 / 800,000원)' },
      '6개월': { quota: 2000, price: 500000, display: '6개월 (6개월 2,000회 제공 / 500,000원)' },
      '1개월': { quota: 300, price: 100000, display: '1개월 (월간 300회 제공 / 100,000원)' },
    },
  },
  ULTRA: {
    label: 'ULTRA (CEO 및 전사 안전관리실 - 11~30인)',
    target: 'CEO 및 전사 안전관리실',
    users: '11 ~ 30인',
    periods: {
      '1년': { quota: 40000, price: 4000000, display: '1년 (연간 40,000회 제공 / 4,000,000원)' },
      '6개월': { quota: 15000, price: 2000000, display: '6개월 (6개월 15,000회 제공 / 2,000,000원)' },
      '1개월': { quota: 2000, price: 500000, display: '1개월 (월간 2,000회 제공 / 500,000원)' },
    },
  },
  TRIAL: {
    label: 'TRIAL (무료 체험 · 사전 검증 희망 고객 - 2인 / 3일간 10회)',
    target: '무료 체험 (사전 검증 희망 고객)',
    users: '2인',
    periods: {
      '3일': { quota: 10, price: 0, display: '3일간 10회 질문 제공 / 무료 (0원)' },
    },
  },
};

export default function GateControlPage() {
  const [step, setStep] = useState<'3-1' | '3-2' | '3-3'>('3-1');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // 사용자 입력 및 시트 연동 상태 (기본값: STANDARD & 1년 고정)
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'STANDARD' | 'PRO' | 'ULTRA' | 'TRIAL'>('STANDARD');
  const [period, setPeriod] = useState<'1년' | '6개월' | '1개월'>('1년');
  const [depositor, setDepositor] = useState('');
  const [licenseKey, setLicenseKey] = useState('');

  // 계좌정보: 환경변수 또는 백엔드 반환값 연동 (보안 격리)
  const [bankInfo, setBankInfo] = useState(
    process.env.NEXT_PUBLIC_BANK_ACCOUNT || '신청 접수 즉시 등록하신 이메일로 전용 계좌번호가 발송됩니다.'
  );

  const currentPlan = BIBLE_PLANS[selectedGrade];
  const currentPeriodDetail =
    selectedGrade === 'TRIAL'
      ? BIBLE_PLANS.TRIAL.periods['3일']
      : currentPlan.periods[period] || currentPlan.periods['1년'];

  // [공통 API 통신 유틸리티: CORS 에러 방지용 text/plain 전송]
  const callGasApi = async (payload: any) => {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  };

  // [3-1단계] 1단계 설문지 신청자 이메일 확인
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!email.trim()) {
      setErrorMsg('구글 설문지(1단계)에서 입력하신 이메일 주소를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const data = await callGasApi({
        action: 'checkUser',
        email: email.trim(),
      });

      if (data.success && data.found) {
        setUserName(data.name || '고객');
        setCompanyName(data.company || '사업장');
        if (data.bankInfo) {
          setBankInfo(data.bankInfo);
        }
        setSelectedGrade('STANDARD');
        setPeriod('1년');

        if (data.status === '승인' && data.licenseKey) {
          setInfoMsg(`${data.name} 님, 승인 완료된 라이선스 키가 있습니다. 키를 입력해 주세요.`);
          setLicenseKey(data.licenseKey);
          setStep('3-3');
        } else {
          setStep('3-2');
        }
      } else {
        setErrorMsg(data.message || '1단계 사전 신청 내역에서 해당 이메일을 찾을 수 없습니다.');
      }
    } catch (err) {
      setErrorMsg('백엔드 서버 통신 중 오류가 발생했습니다. Apps Script 배포 URL 설정을 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // [3-2단계] 등급·기간·실입금자명 제출 -> 관리대장 즉시 인입 및 2차 안내메일 즉시 발송
  const handleSubmitSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (selectedGrade !== 'TRIAL' && !depositor.trim()) {
      setErrorMsg('유료 등급 신청 시 실입금자명(또는 사업장명)을 반드시 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const data = await callGasApi({
        action: 'submitSubscription',
        email: email.trim(),
        grade: selectedGrade,
        period: selectedGrade === 'TRIAL' ? '3일' : period,
        quota: currentPeriodDetail.quota,
        price: currentPeriodDetail.price,
        depositor: selectedGrade === 'TRIAL' ? '무료체험' : depositor.trim(),
      });

      if (data.success) {
        if (selectedGrade === 'TRIAL') {
          setInfoMsg('무료체험(TRIAL) 신청이 등록되었습니다. 관리자 승인 후 발급된 키를 입력해 주세요.');
        } else {
          setInfoMsg('구독 신청 및 실입금자명이 고객관리대장에 정상 접수되었습니다! 입력하신 이메일로 전용 계좌 안내 메일이 발송되었습니다.');
        }
        setStep('3-3');
      } else {
        setErrorMsg(data.message || '구독 신청 저장 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setErrorMsg('구독 신청 전송 중 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [3-3단계] 라이선스 키 검증 후 4단계 본 관제탑 이동
  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!licenseKey.trim()) {
      setErrorMsg('라이선스 키(인증코드)를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const data = await callGasApi({
        action: 'verifyLicense',
        email: email.trim(),
        licenseKey: licenseKey.trim(),
      });

      if (data.success && data.verified) {
        sessionStorage.setItem('sc_verified_email', email.trim());
        sessionStorage.setItem('sc_verified_grade', data.grade || selectedGrade);
        sessionStorage.setItem('sc_verified_key', licenseKey.trim());
        sessionStorage.setItem('sc_user_info', JSON.stringify(data));

        // 4단계 메인 안전 관제탑 대시보드로 진입
        window.location.href = `/index.html?tier=${encodeURIComponent(data.grade || selectedGrade)}`;
      } else {
        setErrorMsg(data.message || '유효하지 않은 라이선스 키이거나 아직 입금 승인 대기 중입니다.');
      }
    } catch (err) {
      setErrorMsg('라이선스 인증 서버 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '560px', width: '100%', backgroundColor: '#1e293b', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', border: '1px solid #334155' }}>
        
        {/* 상단 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-block', backgroundColor: '#1d4ed8', color: '#fff', fontWeight: 'bold', padding: '6px 14px', borderRadius: '9999px', fontSize: '13px', marginBottom: '12px' }}>
            CEO의 법적 생존을 통제하는 안전 관제탑
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#ffffff' }}>
            Safety Consulting 앱 관문 (3단계)
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
            20년 경력 산업안전 전문가 AI 맞춤형 컨설팅 시스템
          </p>
        </div>

        {/* 진행 단계 표시 바 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px', fontSize: '13px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
          <span style={{ color: step === '3-1' ? '#38bdf8' : '#64748b', fontWeight: step === '3-1' ? 'bold' : 'normal' }}>
            3-1. 신청자 확인
          </span>
          <span style={{ color: '#475569' }}>➔</span>
          <span style={{ color: step === '3-2' ? '#38bdf8' : '#64748b', fontWeight: step === '3-2' ? 'bold' : 'normal' }}>
            3-2. 등급·결제 신청
          </span>
          <span style={{ color: step === '3-3' ? '#38bdf8' : '#64748b', fontWeight: step === '3-3' ? 'bold' : 'normal' }}>
            3-3. 라이선스 키 인증
          </span>
        </div>

        {/* 에러 및 안내 메시지 */}
        {errorMsg && (
          <div style={{ backgroundColor: '#7f1d1d', color: '#fecaca', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', border: '1px solid #dc2626' }}>
            ⚠️ {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div style={{ backgroundColor: '#1e3a8a', color: '#bfdbfe', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', border: '1px solid #3b82f6' }}>
            ℹ️ {infoMsg}
          </div>
        )}

        {/* ==================== [3-1단계] 이메일 조회 ==================== */}
        {step === '3-1' && (
          <form onSubmit={handleCheckEmail}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
              1단계 설문지에서 입력한 이메일 주소
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="예: safety@company.com"
              required
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '15px', marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
              {loading ? '신청 내역 조회 중...' : '다음 (사전 신청 확인)'}
            </button>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  if (!email.trim()) {
                    setErrorMsg('이메일을 먼저 입력하신 후 버튼을 눌러주세요.');
                    return;
                  }
                  setStep('3-3');
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer' }}
              >
                이미 라이선스 키를 발급받으셨나요? (바로 키 입력하기)
              </button>
            </div>
          </form>
        )}

        {/* ==================== [3-2단계] 등급 선택 및 입금 안내 ==================== */}
        {step === '3-2' && (
          <form onSubmit={handleSubmitSubscription}>
            <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#cbd5e1' }}>
              반갑습니다, <strong>{userName}</strong> 님 ({companyName || '개인'})!<br />
              이용하실 구독 등급과 구독 기간을 선택해 주세요.
            </div>

            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
              구독 등급 선택
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value as any)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '14.5px', marginBottom: '16px' }}
            >
              <option value="STANDARD">{BIBLE_PLANS.STANDARD.label}</option>
              <option value="PRO">{BIBLE_PLANS.PRO.label}</option>
              <option value="ULTRA">{BIBLE_PLANS.ULTRA.label}</option>
              <option value="TRIAL">{BIBLE_PLANS.TRIAL.label}</option>
            </select>

            {selectedGrade !== 'TRIAL' ? (
              <>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
                  구독 기간 및 요금 선택 (기본: 1년)
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '14.5px', marginBottom: '16px' }}
                >
                  <option value="1년">{currentPlan.periods['1년'].display}</option>
                  <option value="6개월">{currentPlan.periods['6개월'].display}</option>
                  <option value="1개월">{currentPlan.periods['1개월'].display}</option>
                </select>

                {/* 선택 상품 요약 */}
                <div style={{ backgroundColor: '#0f172a', border: '1px solid #38bdf8', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13.5px', lineHeight: '1.6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                    <span>• 사용 인원(팀원 한도): <strong>{currentPlan.users}</strong></span>
                    <span>• Q&amp;A 부여 한도: <strong>{currentPeriodDetail.quota.toLocaleString()}회</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #334155', fontSize: '15px' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>결제하실 구독료 ({period})</span>
                    <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '17px' }}>
                      {currentPeriodDetail.price.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 무통장 입금 계좌 안내 (환경변수 연동 및 보안 격리) */}
                <div style={{ backgroundColor: '#1e3a8a', padding: '14px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13.5px', lineHeight: '1.7', color: '#e0f2fe', border: '1px solid #3b82f6' }}>
                  💳 <strong>무통장 입금 계좌 안내</strong><br />
                  • 입금 계좌: <strong style={{ color: '#fde047', fontSize: '15px' }}>{bankInfo}</strong><br />
                  • 아래 [구독 신청 완료]를 누르시면 입력하신 이메일로 <strong>입금 계좌 안내 메일</strong>이 즉시 발송됩니다.<br />
                  • 입금 확인 후 운영진 승인 시 <strong>라이선스 키</strong>가 이메일로 최종 발급됩니다.<br />
                  • 앱 구독료는 100% 전액 <strong>산업안전보건관리비</strong>로 사용 가능합니다.
                </div>

                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
                  실입금자명 (입금하시는 분 성명 또는 사업장명) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={depositor}
                  onChange={(e) => setDepositor(e.target.value)}
                  placeholder="실제 입금자명을 입력해 주세요 (미입력 시 신청자명으로 처리)"
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '15px', marginBottom: '16px', boxSizing: 'border-box' }}
                />
              </>
            ) : (
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #38bdf8', padding: '14px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#e2e8f0', lineHeight: '1.6' }}>
                🎁 <strong>TRIAL (사전 검증 무료 체험) 안내</strong><br />
                • 사용자 수: <strong>2인</strong> / 체험 기간 및 한도: <strong>3일간 10회</strong><br />
                • 가격: <strong>무료 (0원)</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStep('3-1')}
                style={{ flex: 1, padding: '14px', backgroundColor: '#475569', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                이전
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ flex: 2, padding: '14px', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                {loading ? '처리 중...' : '구독 신청 완료 및 입금 안내 메일 수신'}
              </button>
            </div>
          </form>
        )}

        {/* ==================== [3-3단계] 라이선스 키 인증 ==================== */}
        {step === '3-3' && (
          <form onSubmit={handleVerifyKey}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
              인증 이메일 확인
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#94a3b8', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' }}
              readOnly
            />

            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
              라이선스 키 (License Key) 입력
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="발급받은 라이선스 키를 입력해 주세요"
              required
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #38bdf8', backgroundColor: '#0f172a', color: '#fff', fontSize: '16px', marginBottom: '20px', boxSizing: 'border-box', letterSpacing: '1px' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStep('3-2')}
                style={{ flex: 1, padding: '14px', backgroundColor: '#475569', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                등급 재선택
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ flex: 2, padding: '14px', backgroundColor: '#16a34a', color: '#fff', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                {loading ? '관제탑 인증 확인 중...' : '인증 완료 및 Safety 앱 시작하기 🚀'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
