'use client';

import React, { useState } from 'react';

// Apps Script 백엔드 배포 웹앱 URL
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

  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'STANDARD' | 'PRO' | 'ULTRA' | 'TRIAL'>('STANDARD');
  const [period, setPeriod] = useState<'1년' | '6개월' | '1개월'>('1년');
  const [depositor, setDepositor] = useState('');
  const [licenseKey, setLicenseKey] = useState('');

  const [bankInfo, setBankInfo] = useState('하나은행 201-890629-15207 (예금주: 권일주)');

  const currentPlan = BIBLE_PLANS[selectedGrade];
  const currentPeriodDetail =
    selectedGrade === 'TRIAL'
      ? BIBLE_PLANS.TRIAL.periods['3일']
      : currentPlan.periods[period] || currentPlan.periods['1년'];

  const callGasApi = async (payload: any) => {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  };

  // [3-1단계] 신청자 이메일 확인
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
        action: 'checkEmail',
        email: email.trim(),
      });

      if (data.result === 'success' && data.found) {
        setUserName(data.name || '고객');
        setCompanyName(data.company || '사업장');
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
      setErrorMsg('백엔드 서버 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [3-2단계] 구독 신청 제출
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
        tier: selectedGrade,
        period: selectedGrade === 'TRIAL' ? '3일' : period,
        quota: currentPeriodDetail.quota,
        price: currentPeriodDetail.price,
        depositor: selectedGrade === 'TRIAL' ? '무료체험' : depositor.trim(),
      });

      if (data.result === 'success') {
        if (selectedGrade === 'TRIAL') {
          setInfoMsg('무료체험(TRIAL) 신청이 등록되었습니다. 관리자 승인 대기 중입니다.');
        } else {
          setInfoMsg('구독 신청 및 실입금자명이 정상 접수되었습니다. 안전관제탑 승인 대기 중입니다.');
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

  // [3-3단계] 라이선스 키 인증 (마스터키 예외 프리패스 포함)
  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!licenseKey.trim()) {
      setErrorMsg('라이선스 키(인증코드)를 입력해 주세요.');
      return;
    }

    // 마스터키 즉시 프리패스 처리
    const upperKey = licenseKey.trim().toUpperCase();
    const masterKeys = ["MASTER-2026", "ADMIN-8888", "DONGJIN-VIP", "1111", "MASTER-DONGJIN", "ADMIN-PASS-9999", "SAFETY-MASTER-1", "MASTER-DONGJIN-CONTROL-9999"];
    if (masterKeys.includes(upperKey)) {
      window.location.href = `/index.html?tier=ULTRA`;
      return;
    }

    setLoading(true);
    try {
      const data = await callGasApi({
        action: 'verifyLicense',
        email: email.trim(),
        licenseKey: licenseKey.trim(),
      });

      if (data.result === 'success' && data.valid) {
        window.location.href = `/index.html?tier=${encodeURIComponent(data.tier || selectedGrade)}`;
      } else {
        setErrorMsg(data.message || '유효하지 않은 라이선스 키이거나 아직 승인 대기 중입니다.');
      }
    } catch (err) {
      setErrorMsg('라이선스 인증 서버 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: step === '3-2' ? '920px' : '560px', width: '100%', backgroundColor: '#1e293b', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', border: '1px solid #334155', transition: 'max-width 0.3s ease' }}>
        
        {/* 상단 헤더: 브랜드 명칭 일괄 통일 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-block', backgroundColor: '#1d4ed8', color: '#fff', fontWeight: 'bold', padding: '6px 14px', borderRadius: '9999px', fontSize: '13px', marginBottom: '12px' }}>
            내 회사의 안전 해결사 &lt;안전관제탑&gt;
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

        {/* ==================== [3-2단계] 좌우 와이드 레이아웃 (좌측: 구독모델 운영안 / 우측: 등급 및 실입금자명 입력) ==================== */}
        {step === '3-2' && (
          <form onSubmit={handleSubmitSubscription}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
              
              {/* [좌측 컬럼] 구독모델 운영안 참고표 */}
              <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8', margin: '0 0 12px 0', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                  📊 구독모델 운영안 참고표
                </h3>
                <div style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#fff' }}>1. STANDARD</strong><br/>
                    • 수험생 / 단일 현장 (1인)<br/>
                    • 1년: 200,000원 (900회)<br/>
                    • 6개월: 150,000원 (400회)
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#fff' }}>2. PRO</strong><br/>
                    • 중소기업 안전관리팀 (2~10인)<br/>
                    • 1년: 800,000원 (4,400회)<br/>
                    • 6개월: 500,000원 (2,000회)
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>3. ULTRA</strong><br/>
                    • CEO 및 전사 안전관리실 (11~30인)<br/>
                    • 1년: 4,000,000원 (40,000회)<br/>
                    • 6개월: 2,000,000원 (15,000회)
                  </div>
                </div>
              </div>

              {/* [우측 컬럼] 등급 선택 및 입금자명 입력 */}
              <div>
                <div style={{ backgroundColor: '#0f172a', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '13.5px', color: '#cbd5e1' }}>
                  반갑습니다, <strong>{userName}</strong> 님 ({companyName || '개인'})!<br />
                  이용하실 구독 등급과 구독 기간을 선택해 주세요.
                </div>

                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 'bold', marginBottom: '6px', color: '#e2e8f0' }}>
                  구독 등급 선택
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value as any)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '14px', marginBottom: '12px' }}
                >
                  <option value="STANDARD">{BIBLE_PLANS.STANDARD.label}</option>
                  <option value="PRO">{BIBLE_PLANS.PRO.label}</option>
                  <option value="ULTRA">{BIBLE_PLANS.ULTRA.label}</option>
                  <option value="TRIAL">{BIBLE_PLANS.TRIAL.label}</option>
                </select>

                {selectedGrade !== 'TRIAL' ? (
                  <>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 'bold', marginBottom: '6px', color: '#e2e8f0' }}>
                      구독 기간 및 요금 선택
                    </label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as any)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '14px', marginBottom: '12px' }}
                    >
                      <option value="1년">{currentPlan.periods['1년'].display}</option>
                      <option value="6개월">{currentPlan.periods['6개월'].display}</option>
                      <option value="1개월">{currentPlan.periods['1개월'].display}</option>
                    </select>

                    {/* 무통장 입금 계좌 안내 (방안 B: 수동 승인 대기 안내 적용) */}
                    <div style={{ backgroundColor: '#1e3a8a', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', lineHeight: '1.6', color: '#e0f2fe', border: '1px solid #3b82f6' }}>
                      💳 <strong>무통장 입금 계좌 안내</strong><br />
                      • 입금 계좌: <strong style={{ color: '#fde047' }}>{bankInfo}</strong><br />
                      • 앱 구독료는 100% 전액 <strong>산업안전보건관리비</strong>로 정산 가능합니다.<br />
                      • 입금 확인 후 안전관제탑 본부에서 승인 후 라이선스 키가 이메일로 발송됩니다. (대기 시간 소요)
                    </div>

                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 'bold', marginBottom: '6px', color: '#e2e8f0' }}>
                      실입금자명 (성명 또는 사업장명) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={depositor}
                      onChange={(e) => setDepositor(e.target.value)}
                      placeholder="실제 입금자명을 입력해 주세요"
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' }}
                    />
                  </>
                ) : (
                  <div style={{ backgroundColor: '#0f172a', border: '1px solid #38bdf8', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13.5px', color: '#e2e8f0' }}>
                    🎁 <strong>TRIAL 무료 체험</strong> (3일간 10회 / 무료)
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setStep('3-1')}
                    style={{ flex: 1, padding: '12px', backgroundColor: '#475569', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  >
                    이전
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ flex: 2, padding: '12px', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', fontSize: '14.5px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  >
                    {loading ? '처리 중...' : '구독 신청 완료'}
                  </button>
                </div>

              </div>
            </div>
          </form>
        )}

        {/* ==================== [3-3단계] 라이선스 키 인증 ==================== */}
        {step === '3-3' && (
          <form onSubmit={handleVerifyKey}>
            <div style={{ backgroundColor: '#1e3a8a', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13.5px', color: '#bfdbfe', border: '1px solid #3b82f6', lineHeight: '1.6' }}>
              ℹ️ 입력하신 이메일로 <strong>&lt;라이선스 키&gt;</strong>가 발송되었습니다. 이 키를 아래에 입력하십시오 (별도로 잘 보관 필요!)
            </div>

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
