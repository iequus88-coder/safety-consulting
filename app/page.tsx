"use client";
/**
 * SAFETY CONSULTING 안전 관제탑 Ver 2004 - 프론트엔드 메인 완본
 * 작성 일자: 2026년 11월 3일 15시
 */
import React, { useState, useEffect } from 'react';

const PLAN_DATA: Record<string, any> = {
  TRIAL: {
    title: 'TRIAL (무료 체험)',
    badge: '사전 검증 특전',
    target: '정식 결제 전 성능을 검증해 보고 싶은 고객 (2인)',
    periods: {
      '3일': { quota: 10, price: 0, priceText: '무료 (0원)', desc: '3일간 10회 Q&A 고정 제공' }
    }
  },
  STANDARD: {
    title: 'STANDARD (현장 표준)',
    badge: '1인 실무자 / 수험생',
    target: '단일 현장 실무자 또는 산업안전지도사/기사 수험생 (1인)',
    periods: {
      '1개월': { quota: 60, price: 30000, priceText: '30,000원', desc: '월간 60회 Q&A 한도' },
      '6개월': { quota: 400, price: 150000, priceText: '150,000원', desc: '6개월 400회 Q&A 한도' },
      '1년': { quota: 900, price: 200000, priceText: '200,000원', desc: '연간 900회 Q&A 한도' }
    }
  },
  PRO: {
    title: 'PRO (기업 핵심)',
    badge: '인기 추천 (2~10인)',
    target: '중소기업(건설/제조) 대표 및 안전관리팀 (2~10인)',
    periods: {
      '1개월': { quota: 300, price: 100000, priceText: '100,000원', desc: '월간 300회 Q&A 한도' },
      '6개월': { quota: 2000, price: 500000, priceText: '500,000원', desc: '6개월 2,000회 Q&A 한도' },
      '1년': { quota: 4400, price: 800000, priceText: '800,000원', desc: '연간 4,400회 Q&A 한도' }
    }
  },
  ULTRA: {
    title: 'ULTRA (전사 엔터프라이즈)',
    badge: '대용량 VIP (11~30인)',
    target: 'CEO 및 전사 안전관리실 법적 리스크 통제 (11~30인)',
    periods: {
      '1개월': { quota: 2000, price: 500000, priceText: '500,000원', desc: '월간 2,000회 Q&A 한도' },
      '6개월': { quota: 15000, price: 2000000, priceText: '2,000,000원', desc: '6개월 15,000회 Q&A 한도' },
      '1년': { quota: 40000, price: 4000000, priceText: '4,000,000원', desc: '연간 40,000회 Q&A 한도' }
    }
  }
};

export default function SafetyControlTowerVer2004() {
  // 구버전(15-0) 로컬스토리지 마스터 이메일 캐시 강제 소각
  useEffect(() => {
    try {
      localStorage.removeItem('masterEmail');
      localStorage.removeItem('sc_email');
      localStorage.removeItem('safety_user_email');
    } catch (e) {}
  }, []);

  const [mainStage, setMainStage] = useState<number>(3); // 3: 3단계 관문, 4: 브라우저 점검, 5: AI 관제탑
  const [subStep, setSubStep] = useState<string>('3-1'); // '3-1', '3-2', '3-3'
  const [loading, setLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 3-1 이메일 입력 상태 (절대 하드코딩 없음 - 빈칸 시작)
  const [inputEmail, setInputEmail] = useState<string>('');

  // 3-2 설문지에서 자동 불러온 신청자 데이터 (Auto-fill)
  const [applicant, setApplicant] = useState({
    name: '',
    company: '',
    bizNo: '',
    phone: '',
    email: '',
    tier: 'PRO',
    period: '6개월',
    commMethod: '이메일 및 문자',
    payer: '',
    note: ''
  });

  // 3-3 라이선스 키 수동 입력 상태
  const [inputLicenseKey, setInputLicenseKey] = useState<string>('');
  const [verifiedUser, setVerifiedUser] = useState<any>(null);

  // 5단계 AI 채팅 상태
  const [question, setQuestion] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; text: string }>>([
    {
      role: 'ai',
      text: '안녕하십니까, 산업안전 분야 20년 경력의 베테랑 전문가 Safety Consulting 안전 관제탑입니다. 중대재해처벌법, 산업안전보건법, 건설기술진흥법, 전기공사업법 등 궁금하신 현장 법규 및 대응 방안을 질문해 주십시오.'
    }
  ]);

  // 등급 변경 시 기본 기간 자동 조정
  const handleTierSelect = (newTier: string) => {
    const defaultPeriod = newTier === 'TRIAL' ? '3일' : (applicant.period === '3일' ? '6개월' : applicant.period);
    setApplicant({ ...applicant, tier: newTier, period: defaultPeriod });
  };

  // [STEP 3-1] 신청자 이메일 조회 -> 2단계 설문 데이터 자동 호출
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');
    const cleanEmail = inputEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('신청서(구글 설문지)에 입력하셨던 올바른 이메일 주소를 입력해 주십시오.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CHECK_EMAIL', email: cleanEmail })
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || '신청 내역을 찾을 수 없습니다.');
      } else {
        const app = data.applicant;
        const validTier = PLAN_DATA[app.tier] ? app.tier : 'PRO';
        const validPeriod = validTier === 'TRIAL' ? '3일' : (PLAN_DATA[validTier].periods[app.period] ? app.period : '6개월');

        setApplicant({
          name: app.name || '',
          company: app.company || '',
          bizNo: app.bizNo || '',
          phone: app.phone || '',
          email: cleanEmail,
          tier: validTier,
          period: validPeriod,
          commMethod: app.commMethod || '이메일 및 문자',
          payer: app.payer || app.name || '',
          note: app.note || ''
        });
        setNotice(`신청자 확인이 완료되었습니다 (${cleanEmail}). 설문지에 입력하신 정보가 3-2 단계에 자동으로 채워졌습니다.`);
        setSubStep('3-2');
      }
    } catch (err) {
      setErrorMsg('서버 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해 주십시오.');
    } finally {
      setLoading(false);
    }
  };

  // [STEP 3-2] 구독 등급 및 기간 확인 완료 -> 관리대장 (기초) 자동 인입 & 2차 메일 발송
  const handleSubmitStep32 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');
    setLoading(true);
    console.log(applicant);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_STEP32',
          ...applicant
        })
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || '구독 신청 처리 중 오류가 발생했습니다.');
      } else {
        setNotice(
          `[신청 완료] 구독관리대장(기초) ${data.rowNumber}행에 자동 인입되었으며(I열 '대기'), 2차 안내 이메일이 발송되었습니다. 관리자 '승인' 후 발송되는 3차 이메일의 라이선스 키를 아래 3-3 단계 빈칸에 입력해 주십시오.`
        );
        setSubStep('3-3');
      }
    } catch (err) {
      setErrorMsg('서버 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [STEP 3-3] 3차 이메일로 받은 라이선스 키 수동 입력 검증
  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');
    const cleanKey = inputLicenseKey.trim().toUpperCase();
    const cleanEmail = (applicant.email || inputEmail).trim().toLowerCase();

    if (!cleanKey) {
      setErrorMsg('3차 승인 이메일로 받으신 라이선스 키를 빈칸에 입력해 주십시오.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_KEY',
          email: cleanEmail,
          licenseKey: cleanKey
        })
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || '라이선스 키 인증에 실패했습니다.');
      } else {
        setVerifiedUser(data.user);
        setNotice('라이선스 키 인증이 완료되었습니다! 4단계 브라우저 점검으로 이동합니다.');
        setMainStage(4);
      }
    } catch (err) {
      setErrorMsg('인증 서버 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [STEP 5] AI 질문 전송
  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    const userQ = question.trim();
    setQuestion('');
    setChatHistory((prev) => [...prev, { role: 'user', text: userQ }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASK_AI',
          email: verifiedUser?.email || applicant.email,
          licenseKey: verifiedUser?.licenseKey || inputLicenseKey,
          question: userQ
        })
      });
      const data = await res.json();
      if (!data.ok) {
        setChatHistory((prev) => [...prev, { role: 'ai', text: `[오류 안내] ${data.error}` }]);
      } else {
        if (data.quotaInfo && verifiedUser) {
          setVerifiedUser({
            ...verifiedUser,
            used: data.quotaInfo.used,
            remain: data.quotaInfo.remain
          });
        }
        setChatHistory((prev) => [...prev, { role: 'ai', text: data.answer }]);
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: 'ai', text: '통신 오류가 발생했습니다.' }]);
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = PLAN_DATA[applicant.tier] || PLAN_DATA.PRO;
  const currentPeriodSpec: any =
    currentPlan.periods[applicant.period] || Object.values(currentPlan.periods)[0];

  return (
    <div style={styles.page}>
      {/* 상단 PC 권장 안내 바 */}
      <div style={styles.topBanner}>
        💻 <strong>PC 환경(Chrome / Edge 브라우저) 이용 권장</strong> : 구독 신청서 확인 및 안전 관제탑 가동은 PC 화면에 최적화되어 있습니다. (스마트폰은 보조 수단으로 활용 가능 / 네이버 웨일·카카오 인앱 브라우저 지양)
      </div>

      <div style={styles.container}>
        {/* 헤더 영역 (15-0 배지 및 우측 상단 GAS 버튼 완전 제거) */}
        <header style={styles.header}>
          <div>
            <div style={styles.badgeRow}>
              <span style={styles.verBadge}>안전관제탑 Ver 2004</span>
              <span style={styles.subBadge}>20년 경력 베테랑 안전 전문가 솔루션</span>
            </div>
            <h1 style={styles.mainTitle}>회사의 법적 리스크를 통제/지원하는 안전 관제탑</h1>
            <p style={styles.subTitle}>
              중처법 등 얽혀있는 20여개의 안전관련법규를 깔끔하게 정리해서 쉬운 솔루션을 제시하는 안전 내비게이션
            </p>
          </div>
        </header>

        {/* 상단 3·4·5단계 관문 탭 */}
        <div style={styles.stageGrid}>
          <div
            onClick={() => setMainStage(3)}
            style={{ ...styles.stageCard, ...(mainStage === 3 ? styles.stageCardActive : {}) }}
          >
            <div style={styles.stageLabel}>3단계 관문 (PC 권장)</div>
            <div style={styles.stageTitle}>신청 확인 · 구독 · 키 인증</div>
            <div style={styles.stageDesc}>3-1 이메일 확인 → 3-2 등급 확정 → 3-3 키 수동인증</div>
          </div>

          <div
            onClick={() => verifiedUser && setMainStage(4)}
            style={{ ...styles.stageCard, ...(mainStage === 4 ? styles.stageCardActive : {}) }}
          >
            <div style={styles.stageLabel}>4단계 관문</div>
            <div style={styles.stageTitle}>브라우저 점검 및 크롬 프리패스</div>
            <div style={styles.stageDesc}>웨일 음성제한 안내 · Chrome / Edge 즉시 가동</div>
          </div>

          <div
            onClick={() => verifiedUser && setMainStage(5)}
            style={{ ...styles.stageCard, ...(mainStage === 5 ? styles.stageCardActive : {}) }}
          >
            <div style={styles.stageLabel}>5단계 메인 가동</div>
            <div style={styles.stageTitle}>안전 관제탑 AI 자문 개시</div>
            <div style={styles.stageDesc}>실시간 Q&A 쿼터 차감 (관리대장 M·N·O열 연동)</div>
          </div>
        </div>

        {/* 알림 및 에러 배너 */}
        {notice && <div style={styles.noticeBox}>✅ {notice}</div>}
        {errorMsg && <div style={styles.errorBox}>⚠️ {errorMsg}</div>}

        {/* ==================== [3단계 관문] ==================== */}
        {mainStage === 3 && (
          <div>
            {/* 3-1, 3-2, 3-3 서브 탭 */}
            <div style={styles.subTabRow}>
              <button
                type="button"
                onClick={() => setSubStep('3-1')}
                style={{ ...styles.subTabBtn, ...(subStep === '3-1' ? styles.subTabBtnActive : {}) }}
              >
                3-1. 신청자 이메일 확인
              </button>
              <button
                type="button"
                onClick={() => applicant.email && setSubStep('3-2')}
                style={{ ...styles.subTabBtn, ...(subStep === '3-2' ? styles.subTabBtnActive : {}) }}
              >
                3-2. 구독 등급 신청 및 대장 인입
              </button>
              <button
                type="button"
                onClick={() => setSubStep('3-3')}
                style={{ ...styles.subTabBtn, ...(subStep === '3-3' ? styles.subTabBtnActive : {}) }}
              >
                3-3. 라이선스 키 인증
              </button>
            </div>

            {/* ---------- [STEP 3-1] ---------- */}
            {subStep === '3-1' && (
              <form onSubmit={handleCheckEmail} style={styles.card}>
                <div style={styles.stepTag}>STEP 3-1</div>
                <h2 style={styles.cardTitle}>사전신청자 이메일 확인 (설문 데이터 자동 연동)</h2>
                <p style={styles.cardDesc}>
                  2단계 구글 설문지에 접수된 데이터를 자동으로 불러옵니다. 확인 완료 시 3-2 단계에 사업장명·사업자번호 등이 자동으로 채워집니다.
                </p>

                <div style={styles.guideHighlight}>
                  📌 <strong>[필수 안내] 신청서(구글 설문지)에 입력하셨던 이메일을 다시 한번 동일하게 입력해 주십시오.</strong>
                </div>

                <label style={styles.label}>신청자 이메일 주소 (관리대장 F열 기준)</label>
                <input
                  type="email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="신청서에 입력하셨던 이메일 주소를 동일하게 입력해 주십시오"
                  style={styles.input}
                  required
                />

                <button type="submit" disabled={loading} style={styles.primaryBtn}>
                  {loading ? '설문 응답 데이터 조회 중...' : '신청자 확인 및 3-2 단계로 이동 →'}
                </button>
              </form>
            )}

            {/* ---------- [STEP 3-2] ---------- */}
            {subStep === '3-2' && (
              <form onSubmit={handleSubmitStep32} style={styles.cardWide}>
                <div style={styles.stepTag}>
                  STEP 3-2 · 신청자 확인 완료 ({applicant.email})
                </div>
                <h2 style={styles.cardTitle}>구독 등급·기간 선택 및 구독관리대장(기초) 자동 인입</h2>
                <p style={styles.cardDesc}>
                  2026. 10. 28 신형 <strong>&lt;구독모델 운영안&gt;</strong> 기준입니다. 신청 완료 시 <strong>관리대장 (기초)</strong> 시트에 자동 인입(I열 &apos;대기&apos;)되며, 관리자 &apos;승인&apos; 시 J열(시작일)·K열(만료일)·L열(라이선스 KEY)이 자동 생성되어 3차 이메일로 발송됩니다.
                </p>

                {/* 1. 4대 등급 선택 카드 */}
                <div style={styles.planGrid}>
                  {Object.keys(PLAN_DATA).map((tKey) => {
                    const pObj = PLAN_DATA[tKey];
                    const isSelected = applicant.tier === tKey;
                    return (
                      <div
                        key={tKey}
                        onClick={() => handleTierSelect(tKey)}
                        style={{
                          ...styles.planCard,
                          ...(isSelected ? styles.planCardSelected : {})
                        }}
                      >
                        <div style={styles.planBadge}>{pObj.badge}</div>
                        <div style={styles.planTitle}>{pObj.title}</div>
                        <div style={styles.planTarget}>{pObj.target}</div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. 선택한 등급의 구독 기간(1개월 / 6개월 / 1년 또는 3일 고정) 선택 */}
                <div style={styles.periodSection}>
                  <div style={styles.sectionSubTitle}>
                    📅 [{applicant.tier}] 구독 기간 및 Q&A 한도 선택 (H열 · M열 자동 반영)
                  </div>
                  <div style={styles.periodGrid}>
                    {Object.keys(currentPlan.periods).map((pKey) => {
                      const spec = currentPlan.periods[pKey];
                      const isPeriodSelected = applicant.period === pKey;
                      return (
                        <div
                          key={pKey}
                          onClick={() => setApplicant({ ...applicant, period: pKey })}
                          style={{
                            ...styles.periodCard,
                            ...(isPeriodSelected ? styles.periodCardSelected : {})
                          }}
                        >
                          <div style={styles.periodName}>
                            {pKey} ({spec.desc})
                          </div>
                          <div style={styles.periodPrice}>{spec.priceText}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. 설문지에서 자동 끌고 온 데이터 확인 (Auto-fill, 중복 입력 불필요) */}
                <div style={styles.autoFillBox}>
                  <div style={styles.sectionSubTitle}>
                    📋 2단계 신청서(구글 설문지) 자동 연동 정보 확인 (수정 가능)
                  </div>

                  {applicant.tier !== 'TRIAL' && (
                    <div style={styles.bankBox}>
                      <div>💳 <strong>유료 구독 무통장 입금 및 산업안전보건관리비 정산 안내</strong></div>
                      <div>• 입금 계좌: <strong>하나은행 201-890629-15207 (예금주: 권일주)</strong> / 결제 금액: <strong>{currentPeriodSpec.priceText}</strong></div>
                      <div>• 정산 특전: 본 서비스 구독료는 <strong>산업안전보건관리비 100% 정산</strong>이 가능합니다 (입금 확인 및 승인 후 B2B 전자세금계산서 별도 송부).</div>
                    </div>
                  )}

                  <div style={styles.formGrid4}>
                    <div>
                      <label style={styles.label}>성명/담당자 (B열 자동인입)</label>
                      <input
                        type="text"
                        value={applicant.name}
                        onChange={(e) => setApplicant({ ...applicant, name: e.target.value })}
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>사업장명 (C열 자동인입)</label>
                      <input
                        type="text"
                        value={applicant.company}
                        onChange={(e) => setApplicant({ ...applicant, company: e.target.value })}
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>사업자등록번호 (D열 자동인입)</label>
                      <input
                        type="text"
                        value={applicant.bizNo}
                        onChange={(e) => setApplicant({ ...applicant, bizNo: e.target.value })}
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>휴대폰 번호 (E열 자동인입)</label>
                      <input
                        type="text"
                        value={applicant.phone}
                        onChange={(e) => setApplicant({ ...applicant, phone: e.target.value })}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={{ ...styles.formGrid4, marginTop: '14px' }}>
                    <div>
                      <label style={styles.label}>신청 이메일 (F열 기준)</label>
                      <input type="text" value={applicant.email} readOnly style={styles.inputReadOnly} />
                    </div>
                    <div>
                      <label style={styles.label}>선택 등급/기간 (G·H열)</label>
                      <input
                        type="text"
                        value={`${applicant.tier} / ${applicant.period} (${currentPeriodSpec.quota.toLocaleString()}회)`}
                        readOnly
                        style={styles.inputReadOnly}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>주 소통 방법 (P열 기록)</label>
                      <select
                        value={applicant.commMethod}
                        onChange={(e) => setApplicant({ ...applicant, commMethod: e.target.value })}
                        style={styles.input}
                      >
                        <option value="이메일 및 문자">이메일 및 문자</option>
                        <option value="이메일">이메일</option>
                        <option value="문자(카카오톡)">문자(카카오톡)</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>실입금자명 (Q열 기록)</label>
                      <input
                        type="text"
                        value={applicant.payer}
                        onChange={(e) => setApplicant({ ...applicant, payer: e.target.value })}
                        placeholder="무통장 입금자 성명/상호"
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading} style={styles.primaryBtn}>
                  {loading
                    ? '관리대장 (기초) 자동 인입 처리 중...'
                    : `${applicant.tier} (${applicant.period}) 신청 완료 및 3-3 단계로 이동 →`}
                </button>
              </form>
            )}

            {/* ---------- [STEP 3-3] ---------- */}
            {subStep === '3-3' && (
              <form onSubmit={handleVerifyKey} style={styles.card}>
                <div style={styles.stepTag}>STEP 3-3</div>
                <h2 style={styles.cardTitle}>라이선스 키 수동 입력 및 인증</h2>
                <p style={styles.cardDesc}>
                  관리자가 입금 확인 후 <strong>관리대장 (기초) I열에 &apos;승인&apos;</strong>을 입력하면 고객님의 이메일로 <strong>3차 최종 승인 이메일(라이선스 KEY 포함)</strong>이 발송됩니다. 메일에 적힌 라이선스 키를 아래 빈칸에 수동으로 입력해 주십시오.
                </p>

                <label style={styles.label}>신청자 이메일 주소</label>
                <input
                  type="email"
                  value={applicant.email || inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="신청하신 이메일 주소"
                  style={{ ...styles.input, marginBottom: '16px' }}
                  required
                />

                <label style={styles.label}>발급받은 라이선스 KEY (3차 이메일에서 복사 후 수동 입력)</label>
                <input
                  type="text"
                  value={inputLicenseKey}
                  onChange={(e) => setInputLicenseKey(e.target.value)}
                  placeholder="예: PR26-XXXX-XXXX"
                  style={styles.input}
                  required
                />

                <button type="submit" disabled={loading} style={styles.primaryBtn}>
                  {loading ? '라이선스 키 검증 중...' : '라이선스 키 인증 완료 및 관제탑 가동 →'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ==================== [4단계 관문: 브라우저 점검] ==================== */}
        {mainStage === 4 && (
          <div style={styles.card}>
            <div style={styles.stepTag}>STEP 4 · 브라우저 환경 점검</div>
            <h2 style={styles.cardTitle}>PC Chrome / Edge 환경 확인 완료</h2>
            <p style={styles.cardDesc}>
              음성 인식 및 실시간 법규 내비게이션의 원활한 작동을 위해 Google Chrome 또는 Microsoft Edge 브라우저 사용을 권장합니다. (네이버 웨일 브라우저는 음성 입력 권한 제한이 있을 수 있습니다.)
            </p>
            <button
              type="button"
              onClick={() => setMainStage(5)}
              style={styles.primaryBtn}
            >
              5단계 안전 관제탑 AI 자문 즉시 개시 →
            </button>
          </div>
        )}

        {/* ==================== [5단계 메인 가동: AI 안전 관제탑] ==================== */}
        {mainStage === 5 && (
          <div style={styles.cardWide}>
            <div style={styles.quotaBar}>
              <div>
                👤 <strong>{verifiedUser?.company || applicant.company}</strong> ({verifiedUser?.name || applicant.name} 님) | 등급: <strong>{verifiedUser?.tier || applicant.tier} ({verifiedUser?.period || applicant.period})</strong>
              </div>
              <div>
                📊 부여 한도(M열): <strong>{verifiedUser?.quota ?? '-'}회</strong> | 사용(N열): <strong>{verifiedUser?.used ?? 0}회</strong> | 잔여 횟수(O열): <strong style={{ color: '#f59e0b' }}>{verifiedUser?.remain ?? '-'}회</strong>
              </div>
            </div>

            <div style={styles.chatBox}>
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleAskAI} style={styles.chatInputRow}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="중대재해처벌법, 산안법, 건진법 등 현장 안전법규 질문을 입력해 주십시오..."
                style={{ ...styles.input, flex: 1, marginBottom: 0 }}
              />
              <button type="submit" disabled={loading} style={styles.sendBtn}>
                {loading ? '답변 생성 중...' : '질문 전송'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0b1120',
    color: '#f8fafc',
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    paddingBottom: '60px'
  },
  topBanner: {
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    color: '#fbd38d',
    padding: '10px 24px',
    fontSize: '14px',
    textAlign: 'center'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '28px 24px'
  },
  header: {
    marginBottom: '24px'
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  verBadge: {
    backgroundColor: '#f59e0b',
    color: '#0f172a',
    fontWeight: '800',
    fontSize: '13px',
    padding: '4px 10px',
    borderRadius: '6px'
  },
  subBadge: {
    color: '#f59e0b',
    fontSize: '14px',
    fontWeight: '600'
  },
  mainTitle: {
    fontSize: '28px',
    fontWeight: '800',
    margin: '0 0 8px 0',
    color: '#ffffff'
  },
  subTitle: {
    fontSize: '15px',
    color: '#94a3b8',
    margin: 0
  },
  stageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px'
  },
  stageCard: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '12px',
    padding: '18px 20px',
    cursor: 'pointer'
  },
  stageCardActive: {
    backgroundColor: '#27231a',
    border: '2px solid #f59e0b'
  },
  stageLabel: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: '4px'
  },
  stageTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: '4px'
  },
  stageDesc: {
    fontSize: '13px',
    color: '#9ca3af'
  },
  noticeBox: {
    backgroundColor: '#064e3b',
    border: '1px solid #10b981',
    color: '#ecfdf5',
    padding: '14px 18px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '15px',
    fontWeight: '600'
  },
  errorBox: {
    backgroundColor: '#7f1d1d',
    border: '1px solid #ef4444',
    color: '#fef2f2',
    padding: '14px 18px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '15px',
    fontWeight: '600'
  },
  subTabRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '14px'
  },
  subTabBtn: {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    border: '1px solid #334155',
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer'
  },
  subTabBtnActive: {
    backgroundColor: '#f59e0b',
    color: '#0f172a',
    border: '1px solid #f59e0b'
  },
  card: {
    maxWidth: '680px',
    margin: '0 auto',
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '14px',
    padding: '28px'
  },
  cardWide: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '14px',
    padding: '28px'
  },
  stepTag: {
    color: '#f59e0b',
    fontSize: '13px',
    fontWeight: '800',
    marginBottom: '6px'
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: '800',
    margin: '0 0 10px 0'
  },
  cardDesc: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.6',
    marginBottom: '20px'
  },
  guideHighlight: {
    backgroundColor: '#1e293b',
    borderLeft: '4px solid #f59e0b',
    padding: '12px 16px',
    borderRadius: '6px',
    color: '#fde68a',
    fontSize: '14px',
    marginBottom: '18px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#0b1120',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#ffffff',
    fontSize: '15px',
    marginBottom: '18px'
  },
  inputReadOnly: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: '15px',
    marginBottom: '18px'
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#f59e0b',
    color: '#0f172a',
    fontWeight: '800',
    fontSize: '16px',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer'
  },
  planGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '14px',
    marginBottom: '22px'
  },
  planCard: {
    backgroundColor: '#0b1120',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '16px',
    cursor: 'pointer'
  },
  planCardSelected: {
    backgroundColor: '#27231a',
    border: '2px solid #f59e0b'
  },
  planBadge: {
    display: 'inline-block',
    backgroundColor: '#1e293b',
    color: '#f59e0b',
    fontSize: '12px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '4px',
    marginBottom: '10px'
  },
  planTitle: {
    fontSize: '17px',
    fontWeight: '800',
    marginBottom: '6px'
  },
  planTarget: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: '1.4'
  },
  periodSection: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '18px',
    marginBottom: '22px'
  },
  sectionSubTitle: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#fbd38d',
    marginBottom: '12px'
  },
  periodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px'
  },
  periodCard: {
    backgroundColor: '#111827',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '14px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  periodCardSelected: {
    backgroundColor: '#1e293b',
    border: '2px solid #38bdf8'
  },
  periodName: {
    fontSize: '14px',
    fontWeight: '700'
  },
  periodPrice: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#f59e0b'
  },
  autoFillBox: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '18px',
    marginBottom: '22px'
  },
  bankBox: {
    backgroundColor: '#1c1917',
    border: '1px solid #78350f',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#fde68a',
    fontSize: '14px',
    lineHeight: '1.7',
    marginBottom: '16px'
  },
  formGrid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '14px'
  },
  quotaBar: {
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: '12px 18px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  chatBox: {
    backgroundColor: '#0b1120',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '18px',
    height: '420px',
    overflowY: 'auto',
    marginBottom: '16px'
  },
  userBubble: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '12px',
    maxWidth: '80%',
    marginLeft: 'auto',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap'
  },
  aiBubble: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    padding: '14px 18px',
    borderRadius: '10px',
    marginBottom: '12px',
    maxWidth: '88%',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap'
  },
  chatInputRow: {
    display: 'flex',
    gap: '12px'
  },
  sendBtn: {
    backgroundColor: '#f59e0b',
    color: '#0f172a',
    fontWeight: '800',
    padding: '0 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer'
  }
};
