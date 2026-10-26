'use client';

import React, { useState } from 'react';

export default function GateControlPage() {
  // 현재 진행 단계: '3-1' (이메일조회) | '3-2' (구독/결제신청) | '3-3' (라이선스키인증)
  const [step, setStep] = useState<'3-1' | '3-2' | '3-3'>('3-1');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // 사용자 입력 및 시트 연동 데이터
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('TRIAL');
  const [period, setPeriod] = useState('1개월');
  const [depositor, setDepositor] = useState('');
  const [licenseKey, setLicenseKey] = useState('');

  // [3-1단계] 1단계 구글 폼 신청자 이메일 확인
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
      const res = await fetch('/api/gate-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkEmail', email: email.trim() }),
      });
      const data = await res.json();

      if (data.found) {
        setUserName(data.name || '고객');
        setCompanyName(data.company || '');
        // 이미 라이선스 키가 발급되어 있는 고객이라면 바로 3-3(키 입력) 단계로 안내 가능
        if (data.hasKey) {
          setInfoMsg(`${data.name} 님, 이미 발급된 라이선스 내역이 확인되었습니다. 라이선스 키를 입력해 주세요.`);
          setStep('3-3');
        } else {
          setStep('3-2');
        }
      } else {
        setErrorMsg('1단계 사전 신청 내역에서 해당 이메일을 찾을 수 없습니다. 설문지에 작성하신 이메일과 동일한지 확인해 주세요.');
      }
    } catch (err) {
      setErrorMsg('서버 통신 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // [3-2단계] 등급 선택 및 구독/입금 정보 제출
  const handleSubmitSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (selectedGrade !== 'TRIAL' && !depositor.trim()) {
      setErrorMsg('유료 등급 신청 시 입금자명(또는 사업장명)을 반드시 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/gate-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitSubscription',
          email: email.trim(),
          grade: selectedGrade,
          period: selectedGrade === 'TRIAL' ? '무료체험' : period,
          depositor: selectedGrade === 'TRIAL' ? '무료체험' : depositor.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        if (selectedGrade === 'TRIAL') {
          setInfoMsg('무료체험(TRIAL) 신청이 등록되었습니다. 발급된 체험용 키 또는 안내받은 키를 입력해 주세요.');
        } else {
          setInfoMsg('구독 및 입금 확인 요청이 접수되었습니다. 관제탑 승인 후 전달받은 라이선스 키를 아래에 입력해 주세요.');
        }
        setStep('3-3');
      } else {
        setErrorMsg(data.message || '구독 신청 저장 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setErrorMsg('서버 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [3-3단계 & 4단계] 라이선스 키 최종 검증 후 5단계(본 앱)로 이동
  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!licenseKey.trim()) {
      setErrorMsg('라이선스 키(인증코드)를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/gate-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verifyKey',
          email: email.trim(),
          licenseKey: licenseKey.trim(),
        }),
      });
      const data = await res.json();

      if (data.valid) {
        // 인증 정보를 브라우저 세션에 저장 후 본 앱(index.html)으로 이동
        sessionStorage.setItem('sc_verified_email', email.trim());
        sessionStorage.setItem('sc_verified_grade', data.grade || selectedGrade);
        sessionStorage.setItem('sc_verified_key', licenseKey.trim());
        window.location.href = `/index.html?tier=${encodeURIComponent(data.grade || selectedGrade)}`;
      } else {
        setErrorMsg(data.message || '유효하지 않은 라이선스 키이거나 아직 입금 승인 대기 중입니다.');
      }
    } catch (err) {
      setErrorMsg('인증 서버 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '520px', width: '100%', backgroundColor: '#1e293b', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', border: '1px solid #334155' }}>
        
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
          <span style={{ color: '#475569' }}>➔</span>
          <span style={{ color: step === '3-3' ? '#38bdf8' : '#64748b', fontWeight: step === '3-3' ? 'bold' : 'normal' }}>
            3-3. 라이선스 키 인증
          </span>
        </div>

        {/* 에러 및 안내 메시지 출력창 */}
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
              placeholder="예: iequus88@gmail.com"
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
              이용하실 구독 등급을 선택해 주세요.
            </div>

            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
              구독 등급 선택
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '15px', marginBottom: '16px' }}
            >
              <option value="TRIAL">TRIAL (무료 체험 - 10회 질문 제공)</option>
              <option value="STANDARD">STANDARD (현장 실무자용 - 월 300회)</option>
              <option value="PRO">PRO (안전관리자·전문가용 - 월 600회)</option>
              <option value="ULTRA">ULTRA (CEO·경영책임자 전담 관제 - 월 1,000회)</option>
            </select>

            {selectedGrade !== 'TRIAL' && (
              <>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
                  구독 기간
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '15px', marginBottom: '16px' }}
                >
                  <option value="1개월">1개월</option>
                  <option value="3개월">3개월</option>
                  <option value="6개월">6개월</option>
                  <option value="12개월">12개월 (연간 할인)</option>
                </select>

                <div style={{ backgroundColor: '#1e3a8a', padding: '14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13.5px', lineHeight: '1.6', color: '#e0f2fe' }}>
                  💳 <strong>무통장 입금 계좌 안내</strong><br />
                  • 은행명: <strong>하나은행</strong> (예금주: <strong>권일주</strong>)<br />
                  • 입금 확인 후 관제탑에서 즉시 라이선스 키를 승인·발급해 드립니다.
                </div>

                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
                  입금자명 (사업장명 또는 성명)
                </label>
                <input
                  type="text"
                  value={depositor}
                  onChange={(e) => setDepositor(e.target.value)}
                  placeholder="입금하시는 분의 성함을 입력해 주세요"
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '15px', marginBottom: '16px', boxSizing: 'border-box' }}
                />
              </>
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
                {loading ? '처리 중...' : '구독 신청 완료 및 키 입력으로 이동'}
              </button>
            </div>
          </form>
        )}

        {/* ==================== [3-3단계 & 4단계] 라이선스 키 입력 ==================== */}
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
