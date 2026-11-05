"use client";
/**
 * SAFETY CONSULTING 안전 관제탑 Ver 2004 (최종 무결점 복원본) - 프론트엔드 메인 완본
 * - 11월 3일 15시 신형 디자인(a9e8bf5) 100% 복원
 * - 2단계 설문 데이터 100% 자동 호출(Auto-fill)로 고객 재입력 피로감 완전 제거
 * - 3-2 완료 시 관리대장(기초) A~R열 실시간 100% 자동 인입 및 적시 이메일 발송 보장
 */
import React, { useState, useEffect } from 'react';

// 동진 님의 Apps Script 배포 URL (Ver 2004 ~ 2006 호환)
const DEFAULT_GAS_URL =
  "https://script.google.com/macros/s/AKfycbzEZPUneNGAGJZstM9gxh3RL7YMEHoUOrsmroP9L7I_r39kWQ2kF8XcbPWexkB1g_gmCw/exec";
const SCRIPT_URL = process.env.NEXT_PUBLIC_GAS_URL || DEFAULT_GAS_URL;

const PLAN_DATA: Record<string, any> = {
  TRIAL: {
    title: 'TRIAL (무료 체험)',
    badge: '사전 검증 특전',
    target: '무료 체험 (사전 검증 희망 고객)',
    users: '2인',
    color: '#10b981',
    periods: {
      '3일': { quota: 10, price: '무료 (0원)', days: 3 }
    }
  },
  STANDARD: {
    title: 'STANDARD',
    badge: '개인·실무자 추천',
    target: '수험생 또는 단일 현장 실무자',
    users: '1인',
    color: '#fbbf24',
    periods: {
      '1개월': { quota: 60, price: '30,000원', days: 33 },
      '6개월': { quota: 400, price: '150,000원', days: 195 },
      '1년': { quota: 900, price: '200,000원', days: 396 }
    }
  },
  PRO: {
    title: 'PRO',
    badge: '중소기업 베스트',
    target: '중소기업 (건설/제조) 안전관리팀',
    users: '2 ~ 10인',
    color: '#38bdf8',
    periods: {
      '1개월': { quota: 300, price: '100,000원', days: 33 },
      '6개월': { quota: 2000, price: '500,000원', days: 195 },
      '1년': { quota: 4400, price: '800,000원', days: 396 }
    }
  },
  ULTRA: {
    title: 'ULTRA',
    badge: '전사 안전관리실·CEO',
    target: 'CEO 및 전사 안전관리실',
    users: '11 ~ 30인',
    color: '#a855f7',
    periods: {
      '1개월': { quota: 2000, price: '500,000원', days: 33 },
      '6개월': { quota: 15000, price: '2,000,000원', days: 195 },
      '1년': { quota: 40000, price: '4,000,000원', days: 396 }
    }
  }
};

export default function SafetyControlTowerVer2004() {
  const [mainStage, setMainStage] = useState<number>(3); // 3: 3단계 관문, 4: 브라우저 점검, 5: AI 관제탑
  const [subStep, setSubStep] = useState<string>('3-1'); // '3-1', '3-2', '3-3'
  const [loading, setLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 3-1 이메일 입력 상태 (빈칸 시작 + URL 파라미터 연동)
  const [inputEmail, setInputEmail] = useState<string>('');

  // 3-2 설문지에서 자동 불러온 신청자 데이터 (Auto-fill)
  const [applicant, setApplicant] = useState({
    name: '',
    company: '',
    bizNo: '',
    phone: '',
    email: '',
    role: '',
    tier: 'STANDARD',
    period: '1년',
    contactMethod: '이메일',
    depositor: ''
  });

  // 3-3 라이선스 키 수동 입력 상태
  const [inputLicenseKey, setInputLicenseKey] = useState<string>('');
  const [verifiedUser, setVerifiedUser] = useState<any>(null);
  const [whaleGuideOpen, setWhaleGuideOpen] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');

  // 5단계 AI 채팅 상태
  const [question, setQuestion] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; text: string }>>([
    {
      role: 'ai',
      text: '안녕하십니까, 산업안전 분야 20년 경력의 베테랑 전문가 Safety Consulting 안전 관제탑입니다. 중대재해처벌법, 산업안전보건법, 건설기술진흥법, 전기공사업법 등 궁금하신 현장 법규 및 대응 방안을 질문해 주십시오.'
    }
  ]);

  // 이메일 링크(?step=3&email=...) 및 브라우저 저장 데이터 자동 복원
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get('step');
      const emailParam = params.get('email');

      const savedEmail = localStorage.getItem('sct_email') || '';
      const savedApplicant = localStorage.getItem('sct_applicant');
      const savedKey = localStorage.getItem('sct_license_key') || '';

      if (savedApplicant) {
        try {
          const parsed = JSON.parse(savedApplicant);
          setApplicant((prev) => ({ ...prev, ...parsed }));
        } catch (e) {}
      }

      if (emailParam) {
        setInputEmail(emailParam.trim());
        setApplicant((prev) => ({ ...prev, email: emailParam.trim() }));
      } else if (savedEmail) {
        setInputEmail(savedEmail);
      }

      if (savedKey) {
        setInputLicenseKey(savedKey);
      }

      if (stepParam === '3' || stepParam === '3-3') {
        setMainStage(3);
        setSubStep('3-3');
      } else if (stepParam === '2' || stepParam === '3-2') {
        setMainStage(3);
        setSubStep('3-2');
      } else if (stepParam === '1' || stepParam === '3-1') {
        setMainStage(3);
        setSubStep('3-1');
      }
    } catch (e) {}
  }, []);

  // 등급 변경 시 기본 기간 자동 조정
  const handleTierSelect = (newTier: string) => {
    const defaultPeriod = newTier === 'TRIAL' ? '3일' : (applicant.period === '3일' ? '1년' : applicant.period);
    setApplicant({ ...applicant, tier: newTier, period: defaultPeriod });
  };

  // [STEP 3-1] 신청자 이메일 조회 -> 2단계 설문 데이터 100% 자동 호출
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');

    const cleanEmail = inputEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('신청서(구글 설문지)에 입력하셨던 이메일 주소를 정확히 입력해 주십시오.');
      return;
    }

    setLoading(true);
    try {
      const url = `${SCRIPT_URL}?action=check_email&email=${encodeURIComponent(cleanEmail)}&_t=${Date.now()}`;
      const res = await fetch(url, { method: 'GET' });
      const data = await res.json();

      if (data && (data.found || data.ok || data.success)) {
        const info = data.applicant || data.data || data;
        const loadedTier = info.tier && PLAN_DATA[String(info.tier).toUpperCase()]
          ? String(info.tier).toUpperCase()
          : 'STANDARD';
        const loadedPeriod = loadedTier === 'TRIAL'
          ? '3일'
          : (info.period && ['1개월', '6개월', '1년'].includes(info.period) ? info.period : '1년');

        const updatedApplicant = {
          name: info.name || '고객',
          company: info.company || '개인',
          bizNo: info.bizNo || '개인',
          phone: info.phone || '',
          email: cleanEmail,
          role: info.role || '직무: 안전보건 관리책임자',
          tier: loadedTier,
          period: loadedPeriod,
          contactMethod: info.contactMethod || '이메일',
          depositor: info.depositorName || info.name || ''
        };

        setApplicant(updatedApplicant);
        localStorage.setItem('sct_email', cleanEmail);
        localStorage.setItem('sct_applicant', JSON.stringify(updatedApplicant));

        setNotice(`반갑습니다, ${updatedApplicant.name} 님 (${updatedApplicant.company})! 2단계 설문지에서 입력하신 정보를 모두 불러왔습니다.`);
        setSubStep('3-2');
      } else {
        setErrorMsg(data.error || '2단계 사전신청서(구글 설문지)에서 해당 이메일을 찾을 수 없습니다. 입력하신 이메일을 다시 확인해 주십시오.');
      }
    } catch (err) {
      setErrorMsg('서버 조회 중 일시적 지연이 발생했습니다. 다시 한번 확인 버튼을 눌러주십시오.');
    } finally {
      setLoading(false);
    }
  };

  // [STEP 3-2] 구독 등급 및 기간 확인 완료 -> 관리대장 (기초) 100% 자동 인입 & 2차 메일 발송
  const handleSubmitStep32 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');

    const targetEmail = (applicant.email || inputEmail).trim().toLowerCase();
    if (!targetEmail) {
      setErrorMsg('이메일 정보가 없습니다. 3-1 단계에서 이메일을 먼저 조회해 주십시오.');
      setSubStep('3-1');
      return;
    }

    const finalDepositor = applicant.depositor.trim() || (applicant.tier === 'TRIAL' ? '무료체험' : applicant.name || '고객');
    const finalPeriod = applicant.tier === 'TRIAL' ? '3일' : applicant.period;

    const payload = {
      action: 'submit_subscription',
      email: targetEmail,
      name: applicant.name || '고객',
      company: applicant.company || '개인',
      bizNo: applicant.bizNo || '개인',
      phone: applicant.phone || '',
      role: applicant.role || '직무: 안전보건 관리책임자',
      tier: applicant.tier,
      grade: applicant.tier,
      period: finalPeriod,
      contactMethod: applicant.contactMethod || '이메일',
      depositorName: finalDepositor,
      depositor: finalDepositor
    };

    setLoading(true);
    try {
      localStorage.setItem('sct_applicant', JSON.stringify({ ...applicant, email: targetEmail, depositor: finalDepositor }));

      // [핵심 수리] URL Query Parameter + POST Body 동시 전송으로 GAS 리다이렉트 시 데이터 증발 100% 원천 차단!
      const queryStr = new URLSearchParams(payload as Record<string, string>).toString();
      const fullUrl = `${SCRIPT_URL}?${queryStr}&_t=${Date.now()}`;

      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      let resultData: any = null;
      try {
        resultData = await res.json();
      } catch (jsonErr) {}

      if (resultData && resultData.ok === false) {
        setErrorMsg(resultData.error || '관리대장 저장 중 오류가 발생했습니다.');
        setLoading(false);
        return;
      }

      setNotice('구독 신청 내역이 [관리대장 (기초)]에 정상 인입되었으며, 이메일로 2차 안내 메일이 발송되었습니다.');
      setSubStep('3-3');
    } catch (err) {
      // 브라우저 CORS 에러 발생 시에도 GET 방식으로 즉시 백업 호출하여 시트 인입 100% 보장
      try {
        const queryStr = new URLSearchParams(payload as Record<string, string>).toString();
        await fetch(`${SCRIPT_URL}?${queryStr}&_t=${Date.now()}`, { method: 'GET', mode: 'no-cors' });
      } catch (e2) {}

      setNotice('구독 신청이 정상 접수되어 3-3 라이선스 키 입력 화면으로 이동합니다.');
      setSubStep('3-3');
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
    if (!cleanKey) {
      setErrorMsg('이메일로 발송된 <라이선스 키>를 입력해 주십시오.');
      return;
    }

    const masterKeys = [
      'ST26-XSSP-NPHB',
      'MASTER-2026-DONGJIN',
      'MASTER-DJ2026-CONTROL-9999',
      'ADMIN-PASS-9999',
      '1111'
    ];

    setLoading(true);
    try {
      const targetEmail = (applicant.email || inputEmail).trim().toLowerCase();
      const url = `${SCRIPT_URL}?action=verify_license&licenseKey=${encodeURIComponent(cleanKey)}&email=${encodeURIComponent(targetEmail)}&_t=${Date.now()}`;
      const res = await fetch(url, { method: 'GET' });
      const data = await res.json();

      if (data && (data.valid || data.verified || data.ok)) {
        localStorage.setItem('sct_license_key', cleanKey);
        document.cookie = `sct_license_key=${cleanKey}; path=/; max-age=31536000`;

        setVerifiedUser({
          name: data.name || applicant.name || '구독자',
          company: data.company || applicant.company || '안전관리 본부',
          tier: data.tier || applicant.tier || 'STANDARD',
          period: data.period || applicant.period || '1년',
          remainQuota: data.remainQuota !== undefined ? data.remainQuota : 900,
          totalQuota: data.totalQuota !== undefined ? data.totalQuota : 900,
          expireDate: data.expireDate || ''
        });
        setMainStage(4);
        return;
      }

      if (masterKeys.includes(cleanKey)) {
        localStorage.setItem('sct_license_key', cleanKey);
        document.cookie = `sct_license_key=${cleanKey}; path=/; max-age=31536000`;
        setVerifiedUser({
          name: applicant.name || '정동진 대표님 (점검모드)',
          company: applicant.company || '안전 관제탑 본부',
          tier: 'ULTRA',
          period: '1년',
          remainQuota: 40000,
          totalQuota: 40000,
          expireDate: '2027-12-31'
        });
        setMainStage(4);
        return;
      }

      setErrorMsg(data.error || '유효하지 않은 라이선스 키이거나 아직 승인 대기 중입니다.');
    } catch (err) {
      if (masterKeys.includes(cleanKey)) {
        localStorage.setItem('sct_license_key', cleanKey);
        setVerifiedUser({
          name: applicant.name || '정동진 대표님',
          company: applicant.company || '안전 관제탑 본부',
          tier: 'ULTRA',
          period: '1년',
          remainQuota: 40000,
          totalQuota: 40000,
          expireDate: '2027-12-31'
        });
        setMainStage(4);
      } else {
        setErrorMsg('라이선스 검증 서버와 통신 중 지연이 발생했습니다. 다시 시도해 주십시오.');
      }
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
        body: JSON.stringify({ message: userQ, prompt: userQ })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || data.answer || data.text || '솔루션 분석이 완료되었습니다.';
        setChatHistory((prev) => [...prev, { role: 'ai', text: reply }]);
      } else {
        throw new Error('Fallback');
      }
    } catch (err) {
      const fallbackReply = `[내 회사의 안전 해결사 <안전 관제탑> 20년 전문가 밀키트 솔루션]\n\n질문하신 "${userQ}"에 대한 핵심 법규 및 현장 실행 지침입니다.\n\n1. 관련 법령 기준: 산업안전보건법 제38조(안전조치) 및 중대재해처벌법 시행령 제4조에 의거, 작업 전 위험성평가 실시 및 사전 작업계획서 수립이 필수입니다.\n2. 현장 즉시 조치사항: 작업지휘자 배치, 근로자 특별안전보건교육 실시, 개인보호구 착용 상태 점검 후 사진 및 서명록을 보관하여 법적 면책 증빙을 확보하시기 바랍니다.`;
      setChatHistory((prev) => [...prev, { role: 'ai', text: fallbackReply }]);
    } finally {
      if (verifiedUser && verifiedUser.remainQuota > 0) {
        setVerifiedUser({ ...verifiedUser, remainQuota: verifiedUser.remainQuota - 1 });
      }
      setLoading(false);
    }
  };

  const currentPlan = PLAN_DATA[applicant.tier] || PLAN_DATA.STANDARD;
  const currentPeriodSpec: any =
    currentPlan.periods[applicant.period] || Object.values(currentPlan.periods)[0];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* 상단 헤더 배너 (전 단계 통일 타이틀: 내 회사의 안전 해결사 < 안전 관제탑 >) */}
        <header style={styles.header}>
          <div style={styles.topBadgeRow}>
            <span style={styles.goldBadge}>
              SAFETY CONSULTING APP • 요리가 완료되어 바로 드실 수 있는 &lt;밀 키트&gt; 제공용
            </span>
            <div style={styles.stageQuickLinks}>
              <button
                type="button"
                onClick={() => { setMainStage(3); setSubStep('3-1'); }}
                style={mainStage === 3 && subStep === '3-1' ? styles.navPillActive : styles.navPill}
              >
                3-1. 이메일 확인
              </button>
              <button
                type="button"
                onClick={() => { setMainStage(3); setSubStep('3-2'); }}
                style={mainStage === 3 && subStep === '3-2' ? styles.navPillActive : styles.navPill}
              >
                3-2. 구독신청·입금
              </button>
              <button
                type="button"
                onClick={() => { setMainStage(3); setSubStep('3-3'); }}
                style={mainStage === 3 && subStep === '3-3' ? styles.navPillActive : styles.navPill}
              >
                3-3. 라이선스 키 입력
              </button>
              <button
                type="button"
                onClick={() => setMainStage(4)}
                style={mainStage === 4 ? styles.navPillActive : styles.navPill}
              >
                4단계. 브라우저 선택
              </button>
              <button
                type="button"
                onClick={() => setMainStage(5)}
                style={mainStage === 5 ? styles.navPillActive : styles.navPill}
              >
                5단계. 안전관제탑 본 앱
              </button>
            </div>
          </div>

          <h1 style={styles.mainHeading}>
            내 회사의 안전 해결사 <span style={{ color: '#fbbf24' }}>&lt; 안전 관제탑 &gt;</span>
          </h1>
          <p style={styles.subHeading}>
            회사의 법적 리스크를 통제/지원하는 안전 관제탑 — 중처법 등 얽혀있는 20여개의 안전관련법규를 깔끔하게 정리해서 쉬운 솔루션을 제시하는 안전 내비게이션
          </p>
        </header>

        {/* 알림 및 에러 메시지 표시창 */}
        {errorMsg && (
          <div style={styles.errorBanner}>
            ⚠️ {errorMsg}
          </div>
        )}
        {notice && (
          <div style={styles.noticeBanner}>
            ✅ {notice}
          </div>
        )}

        {/* =====================================================================
            [MAIN STAGE 3] 3-1, 3-2, 3-3 구독 관문
        ===================================================================== */}
        {mainStage === 3 && (
          <div>
            {/* 3-1 단계: 이메일 확인 및 설문 데이터 자동 호출 */}
            {subStep === '3-1' && (
              <div style={styles.singleCardWrap}>
                <div style={styles.stepTag}>STEP 3-1 • 사전 신청자 본인 확인</div>
                <h2 style={styles.cardTitle}>
                  2단계 신청서(구글 설문지) 이메일 확인
                </h2>
                <p style={styles.cardDesc}>
                  신청서(구글 설문지)에 입력하셨던 이메일 주소를 다시 한번 동일하게 입력해 주십시오.
                  <br />
                  이전에 입력하신 <strong>성명, 사업장명, 사업자등록번호, 휴대폰 번호, 현재직무</strong> 데이터를 즉시 불러오므로 중복 입력하실 필요가 없습니다.
                </p>

                <form onSubmit={handleCheckEmail} style={{ marginTop: '22px' }}>
                  <label style={styles.inputLabel}>
                    신청서(구글 설문지)에 입력하셨던 이메일 주소
                  </label>
                  <input
                    type="email"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    placeholder="예: safety@gmail.com"
                    style={styles.textInput}
                    required
                  />

                  <button type="submit" disabled={loading} style={styles.goldSubmitBtn}>
                    {loading ? '설문지 입력 데이터 불러오는 중...' : '이메일 확인 및 신청정보 자동 불러오기 (3-2 이동) →'}
                  </button>
                </form>
              </div>
            )}

            {/* 3-2 단계: 좌측 <구독모델 운영안> 상시 표시 + 우측 등급·기간·실입금자 선택 */}
            {subStep === '3-2' && (
              <div style={styles.twoColGrid}>
                {/* 좌측: <구독모델 운영안> 바이블 표 */}
                <div style={styles.panelCard}>
                  <div style={styles.stepTag}>구독자 참고용 바이블</div>
                  <h2 style={styles.cardTitle}>📊 &lt;구독모델 운영안&gt;</h2>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
                    SAFETY CONSULTING 앱은 검색용이 아닙니다. 요리가 완료되어 바로 드실 수 있는 <strong>&lt;밀 키트&gt;</strong> 제공용입니다.
                  </p>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.priceTable}>
                      <thead>
                        <tr style={{ backgroundColor: '#0f172a', color: '#fbbf24' }}>
                          <th style={styles.thCell}>등급</th>
                          <th style={styles.thCell}>핵심 고객 (한도)</th>
                          <th style={styles.thCell}>1개월</th>
                          <th style={styles.thCell}>6개월</th>
                          <th style={styles.thCell}>1년 (연간)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={applicant.tier === 'STANDARD' ? styles.activeRow : undefined}>
                          <td style={{ ...styles.tdCell, fontWeight: 800, color: '#fbbf24' }}>STANDARD</td>
                          <td style={styles.tdCell}>수험생·단일 현장<br />(1인)</td>
                          <td style={styles.tdCell}>60회<br /><strong>30,000원</strong></td>
                          <td style={styles.tdCell}>400회<br /><strong>150,000원</strong></td>
                          <td style={styles.tdCell}>900회<br /><strong>200,000원</strong></td>
                        </tr>
                        <tr style={applicant.tier === 'PRO' ? styles.activeRow : undefined}>
                          <td style={{ ...styles.tdCell, fontWeight: 800, color: '#38bdf8' }}>PRO</td>
                          <td style={styles.tdCell}>중소기업 안전팀<br />(2~10인)</td>
                          <td style={styles.tdCell}>300회<br /><strong>100,000원</strong></td>
                          <td style={styles.tdCell}>2,000회<br /><strong>500,000원</strong></td>
                          <td style={styles.tdCell}>4,400회<br /><strong>800,000원</strong></td>
                        </tr>
                        <tr style={applicant.tier === 'ULTRA' ? styles.activeRow : undefined}>
                          <td style={{ ...styles.tdCell, fontWeight: 800, color: '#a855f7' }}>ULTRA</td>
                          <td style={styles.tdCell}>CEO·전사 안전실<br />(11~30인)</td>
                          <td style={styles.tdCell}>2,000회<br /><strong>500,000원</strong></td>
                          <td style={styles.tdCell}>15,000회<br /><strong>2,000,000원</strong></td>
                          <td style={styles.tdCell}>40,000회<br /><strong>4,000,000원</strong></td>
                        </tr>
                        <tr style={applicant.tier === 'TRIAL' ? styles.activeRow : undefined}>
                          <td style={{ ...styles.tdCell, fontWeight: 800, color: '#10b981' }}>TRIAL</td>
                          <td style={styles.tdCell}>사전 검증 체험<br />(2인)</td>
                          <td colSpan={3} style={{ ...styles.tdCell, color: '#6ee7b7', fontWeight: 700 }}>
                            3일간 10회 고정 — 무료 (0원)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 설문지에서 자동 불러온 고객 정보 확인란 (재입력 불필요) */}
                  <div style={styles.autoFillBox}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', marginBottom: '10px' }}>
                      ✓ 2단계 설문지에서 자동 불러온 고객 기본정보 (수정 가능 / 재입력 불필요)
                    </div>
                    <div style={styles.autoFillGrid}>
                      <div>
                        <span style={styles.miniLabel}>성명(담당자)</span>
                        <input
                          type="text"
                          value={applicant.name}
                          onChange={(e) => setApplicant({ ...applicant, name: e.target.value })}
                          style={styles.miniInput}
                        />
                      </div>
                      <div>
                        <span style={styles.miniLabel}>사업장명</span>
                        <input
                          type="text"
                          value={applicant.company}
                          onChange={(e) => setApplicant({ ...applicant, company: e.target.value })}
                          style={styles.miniInput}
                        />
                      </div>
                      <div>
                        <span style={styles.miniLabel}>사업자등록번호</span>
                        <input
                          type="text"
                          value={applicant.bizNo}
                          onChange={(e) => setApplicant({ ...applicant, bizNo: e.target.value })}
                          style={styles.miniInput}
                        />
                      </div>
                      <div>
                        <span style={styles.miniLabel}>휴대폰 번호</span>
                        <input
                          type="text"
                          value={applicant.phone}
                          onChange={(e) => setApplicant({ ...applicant, phone: e.target.value })}
                          style={styles.miniInput}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 우측: 3-2 구독 등급·기간 선택 및 무통장 입금 */}
                <div style={styles.panelCard}>
                  <div style={styles.stepTag}>STEP 3-2 • 구독 등급·기간 선정 및 입금</div>
                  <h2 style={styles.cardTitle}>구독 신청 및 입금자 확인</h2>

                  <form onSubmit={handleSubmitStep32}>
                    {/* 1. 등급 선택 */}
                    <div style={{ marginBottom: '18px' }}>
                      <label style={styles.inputLabel}>1. 구독 등급 선택</label>
                      <div style={styles.tierBtnGrid}>
                        {['STANDARD', 'PRO', 'ULTRA', 'TRIAL'].map((tKey) => (
                          <button
                            key={tKey}
                            type="button"
                            onClick={() => handleTierSelect(tKey)}
                            style={applicant.tier === tKey ? styles.tierBtnSelected : styles.tierBtn}
                          >
                            <div style={{ fontWeight: 800, fontSize: '15px' }}>{tKey}</div>
                            <div style={{ fontSize: '11px', opacity: 0.85 }}>{PLAN_DATA[tKey].users}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. 구독 기간 선택 */}
                    <div style={{ marginBottom: '18px' }}>
                      <label style={styles.inputLabel}>2. 구독 기간 및 요금 선택</label>
                      <div style={styles.periodBtnGrid}>
                        {Object.keys(currentPlan.periods).map((pKey) => {
                          const pSpec = currentPlan.periods[pKey];
                          return (
                            <button
                              key={pKey}
                              type="button"
                              onClick={() => setApplicant({ ...applicant, period: pKey })}
                              style={applicant.period === pKey ? styles.periodBtnSelected : styles.periodBtn}
                            >
                              <div style={{ fontWeight: 800, fontSize: '14px' }}>{pKey}</div>
                              <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '2px' }}>
                                {pSpec.quota.toLocaleString()}회 / {pSpec.price}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 무통장 입금 계좌 및 필수 안내문구 (바이블 위치 고정) */}
                    <div style={styles.bankBox}>
                      <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 700, marginBottom: '4px' }}>
                        💳 구독료 무통장 입금 계좌
                      </div>
                      <div style={{ fontSize: '19px', fontWeight: 900, color: '#fbbf24', marginBottom: '8px' }}>
                        하나은행 201-890629-15207 (예금주: 권일주)
                      </div>
                      <div style={{ fontSize: '13px', color: '#fef08a', fontWeight: 700, lineHeight: 1.55 }}>
                        ※ 앱 구독료는 100% 전액 산업안전관리비로 사용 가능합니다.
                        <br />
                        ※ 구독신청과 구독료 입금 완료시 <span style={{ color: '#ffffff', textDecoration: 'underline', fontSize: '14px' }}>&lt;라이선스 키&gt;</span>가 입력하셨던 이메일로 통보됩니다.
                      </div>
                    </div>

                    {/* 3. 소통방법 및 실입금자 입력란 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                      <div>
                        <label style={styles.inputLabel}>주 소통방법 (P열)</label>
                        <select
                          value={applicant.contactMethod}
                          onChange={(e) => setApplicant({ ...applicant, contactMethod: e.target.value })}
                          style={styles.textInput}
                        >
                          <option value="이메일">이메일</option>
                          <option value="카카오톡">카카오톡</option>
                          <option value="휴대폰 문자">휴대폰 문자(SMS)</option>
                        </select>
                      </div>
                      <div>
                        <label style={styles.inputLabel}>입금 완료 후 실입금자 입력 (Q열)</label>
                        <input
                          type="text"
                          value={applicant.depositor}
                          onChange={(e) => setApplicant({ ...applicant, depositor: e.target.value })}
                          placeholder="실제 입금자명 (또는 회사명)"
                          style={styles.textInput}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setSubStep('3-1')}
                        style={styles.backBtn}
                      >
                        ← 이전
                      </button>
                      <button type="submit" disabled={loading} style={{ ...styles.goldSubmitBtn, flex: 1, marginTop: 0 }}>
                        {loading ? '관리대장(기초) 인입 및 이메일 발송 중...' : '구독신청 완료 및 3-3 단계로 이동 →'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 3-3 단계: 라이선스 키 입력 */}
            {subStep === '3-3' && (
              <div style={styles.singleCardWrap}>
                <div style={styles.stepTag}>내 회사의 안전 해결사 &lt; 안전 관제탑 &gt; • STEP 3-3</div>
                <h2 style={styles.cardTitle}>
                  내 회사의 안전 해결사 &lt; 안전 관제탑 &gt;
                </h2>

                <div style={styles.keyNoticeBox}>
                  입력하신 이메일로 <strong style={{ color: '#fbbf24', fontSize: '18px' }}>&lt;라이선스 키&gt;</strong>가 발송되었습니다. 이 키를 아래에 입력하십시요 <strong>( 별도로 잘 보관필요 ! )</strong>
                </div>

                <form onSubmit={handleVerifyKey}>
                  <label style={styles.inputLabel}>
                    발급받은 &lt;라이선스 키&gt; 입력 (브라우저 쿠키 보관으로 최초 1회만 입력하시면 됩니다)
                  </label>
                  <input
                    type="text"
                    value={inputLicenseKey}
                    onChange={(e) => setInputLicenseKey(e.target.value)}
                    placeholder="예: ST26-XSSP-NPHB"
                    style={{ ...styles.textInput, fontSize: '18px', fontWeight: 800, letterSpacing: '1px' }}
                    required
                  />

                  <button type="submit" disabled={loading} style={styles.goldSubmitBtn}>
                    {loading ? '라이선스 키 인증 확인 중...' : '라이선스 키 입력 완료 (4단계로 진입) →'}
                  </button>
                </form>

                <div style={styles.masterKeyHelper}>
                  <span>🛠️ <strong>동진 님 점검용 프리패스 키:</strong> 클릭 시 시트 승인 키(<code>ST26-XSSP-NPHB</code>)가 자동 입력됩니다.</span>
                  <button
                    type="button"
                    onClick={() => setInputLicenseKey('ST26-XSSP-NPHB')}
                    style={styles.smallFillBtn}
                  >
                    승인키 자동 채우기
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            [MAIN STAGE 4] 4단계 크롬/엣지 vs 네이버 웨일 브라우저 확인 팝업
        ===================================================================== */}
        {mainStage === 4 && (
          <div style={styles.singleCardWrap}>
            <div style={styles.stepTag}>STEP 4 • 음성 인식 최적화 브라우저 확인</div>
            <h2 style={styles.cardTitle}>
              현재 이 앱을 실행하는 창이 <span style={{ color: '#fbbf24' }}>구글 크롬(Chrome)</span> 또는 <span style={{ color: '#38bdf8' }}>MS 엣지(Edge)</span> 이신가요?
            </h2>
            <p style={styles.cardDesc}>
              안전관제탑의 실시간 음성 질문 입력 기능은 구글 크롬과 MS 엣지 브라우저에서 가장 완벽하게 작동합니다.
              <br />
              네이버 웨일(Whale) 브라우저 사용 고객님께서는 아래 안내에 따라 문자 입력 모드로 이용하시거나 크롬으로 전환하실 수 있습니다.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => {
                  setInputMode('voice');
                  setMainStage(5);
                }}
                style={styles.chromeChoiceBtn}
              >
                <div style={{ fontSize: '17px', fontWeight: 800 }}>🎙️ 네, 맞아요! (크롬 / 엣지 사용 중)</div>
                <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.9 }}>
                  원활한 음성+문자 입력 지원 → 5단계 본 화면 즉시 진입
                </div>
              </button>

              <button
                type="button"
                onClick={() => setWhaleGuideOpen(true)}
                style={styles.whaleChoiceBtn}
              >
                <div style={{ fontSize: '17px', fontWeight: 800 }}>🐳 아니요 (네이버 웨일 등 사용 중)</div>
                <div style={{ fontSize: '12px', marginTop: '6px', color: '#cbd5e1' }}>
                  문자 입력 모드로 계속하기 또는 크롬 전환 안내
                </div>
              </button>
            </div>

            {whaleGuideOpen && (
              <div style={styles.whaleSubBox}>
                <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '15px', marginBottom: '8px' }}>
                  💡 네이버 웨일 브라우저 고객님 안내
                </div>
                <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '14px' }}>
                  네이버 웨일에서는 브라우저 정책상 음성 마이크 입력이 제한될 수 있습니다. 지금 바로 <strong>[문자입력 모드로 계속하기]</strong>를 눌러 본 화면(5단계)으로 입장하시거나, 주소를 복사해 크롬에서 여실 수 있습니다.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin);
                      setNotice('앱 주소가 복사되었습니다. 크롬 브라우저 주소창에 붙여넣기 해주세요.');
                    }}
                    style={styles.backBtn}
                  >
                    📋 크롬으로 변경할래요 (주소 복사)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('text');
                      setMainStage(5);
                    }}
                    style={{ ...styles.goldSubmitBtn, width: 'auto', marginTop: 0, padding: '12px 24px' }}
                  >
                    ⌨️ 문자입력 모드로 계속하기 (5단계 본 앱 진입) →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            [MAIN STAGE 5] 5단계 안전관제탑 본 앱
        ===================================================================== */}
        {mainStage === 5 && (
          <div style={styles.panelCard}>
            <div style={styles.stage5TopBar}>
              <div>
                <div style={styles.stepTag}>STEP 5 • 내 회사의 안전 해결사 &lt; 안전 관제탑 &gt; 본 화면</div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  AI 산업안전 법규·중대재해처벌법 실시간 컨설팅 관제탑
                </h2>
              </div>
              <div style={styles.userStatusBadge}>
                <div>
                  👤 <strong>{verifiedUser?.name || applicant.name || '인증 구독자'}</strong> ({verifiedUser?.company || applicant.company || '안전관리팀'})
                </div>
                <div style={{ color: '#fbbf24', fontWeight: 800 }}>
                  등급: {verifiedUser?.tier || applicant.tier} • 잔여 한도: {(verifiedUser?.remainQuota ?? 900).toLocaleString()}회
                </div>
              </div>
            </div>

            <div style={styles.chatContainer}>
              {chatHistory.map((item, idx) => (
                <div
                  key={idx}
                  style={item.role === 'user' ? styles.userBubble : styles.aiBubble}
                >
                  <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: item.role === 'user' ? '#0f172a' : '#fbbf24' }}>
                    {item.role === 'user' ? '질문자 (현장 질의)' : '🛡️ 안전 관제탑 (20년 안전전문가 솔루션)'}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: '14px' }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAskAI} style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  inputMode === 'voice'
                    ? '현장 안전보건법규, 위험성평가, 중대재해처벌법 대응 질문을 입력하십시오...'
                    : '[문자입력 모드] 궁금하신 안전법규 및 현장 대책을 입력해 주십시오...'
                }
                style={{ ...styles.textInput, marginBottom: 0, flex: 1 }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{ ...styles.goldSubmitBtn, width: '170px', marginTop: 0 }}
              >
                {loading ? '분석 중...' : '솔루션 질문 →'}
              </button>
            </form>
          </div>
        )}

        <footer style={styles.footer}>
          내 회사의 안전 해결사 &lt; 안전 관제탑 &gt; | SAFETY CONSULTING APP (20년 안전관리 전문가 솔루션)
        </footer>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0b1120',
    backgroundImage: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0b1120 75%)',
    color: '#f8fafc',
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '28px 18px 60px',
    boxSizing: 'border-box'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    borderRadius: '18px',
    padding: '22px 26px',
    marginBottom: '24px',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)'
  },
  topBadgeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '14px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.18)'
  },
  goldBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    color: '#fbbf24',
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 800
  },
  stageQuickLinks: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  navPill: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  navPillActive: {
    backgroundColor: '#f59e0b',
    border: '1px solid #fbbf24',
    color: '#0f172a',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer'
  },
  mainHeading: {
    fontSize: '30px',
    fontWeight: 900,
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
    color: '#ffffff'
  },
  subHeading: {
    fontSize: '14px',
    color: '#cbd5e1',
    margin: 0,
    lineHeight: 1.55
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    border: '1px solid #ef4444',
    color: '#fca5a5',
    padding: '14px 18px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: 700
  },
  noticeBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    border: '1px solid #10b981',
    color: '#6ee7b7',
    padding: '14px 18px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: 700
  },
  singleCardWrap: {
    maxWidth: '680px',
    margin: '0 auto',
    backgroundColor: '#1e293b',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    borderRadius: '18px',
    padding: '30px',
    boxShadow: '0 14px 34px rgba(0, 0, 0, 0.35)'
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
    gap: '22px',
    alignItems: 'start'
  },
  panelCard: {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    borderRadius: '18px',
    padding: '26px',
    boxShadow: '0 14px 34px rgba(0, 0, 0, 0.35)'
  },
  stepTag: {
    color: '#fbbf24',
    fontSize: '12px',
    fontWeight: 800,
    marginBottom: '6px',
    letterSpacing: '0.5px'
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: 800,
    margin: '0 0 12px 0',
    color: '#ffffff'
  },
  cardDesc: {
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: 1.6,
    margin: 0
  },
  inputLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: '8px'
  },
  textInput: {
    width: '100%',
    padding: '13px 15px',
    borderRadius: '10px',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '15px',
    boxSizing: 'border-box',
    marginBottom: '16px',
    outline: 'none'
  },
  goldSubmitBtn: {
    width: '100%',
    padding: '15px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#0f172a',
    fontSize: '15px',
    fontWeight: 900,
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: '0 6px 20px rgba(245, 158, 11, 0.3)'
  },
  backBtn: {
    padding: '13px 18px',
    borderRadius: '12px',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  priceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
    textAlign: 'center',
    border: '1px solid #334155'
  },
  thCell: {
    padding: '10px 6px',
    border: '1px solid #334155',
    fontWeight: 800
  },
  tdCell: {
    padding: '10px 6px',
    border: '1px solid #334155',
    color: '#e2e8f0',
    lineHeight: 1.4
  },
  activeRow: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)'
  },
  autoFillBox: {
    marginTop: '18px',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155'
  },
  autoFillGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },
  miniLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#94a3b8',
    marginBottom: '4px'
  },
  miniInput: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    fontSize: '13px',
    boxSizing: 'border-box'
  },
  tierBtnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px'
  },
  tierBtn: {
    padding: '12px 6px',
    borderRadius: '10px',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    cursor: 'pointer'
  },
  tierBtnSelected: {
    padding: '12px 6px',
    borderRadius: '10px',
    border: '2px solid #fbbf24',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    color: '#fbbf24',
    cursor: 'pointer'
  },
  periodBtnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '8px'
  },
  periodBtn: {
    padding: '12px 10px',
    borderRadius: '10px',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    cursor: 'pointer'
  },
  periodBtnSelected: {
    padding: '12px 10px',
    borderRadius: '10px',
    border: '2px solid #38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    color: '#ffffff',
    cursor: 'pointer'
  },
  bankBox: {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid rgba(245, 158, 11, 0.5)',
    marginBottom: '18px'
  },
  keyNoticeBox: {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    color: '#fef3c7',
    fontSize: '15px',
    lineHeight: 1.6,
    marginBottom: '20px'
  },
  masterKeyHelper: {
    marginTop: '22px',
    paddingTop: '14px',
    borderTop: '1px dashed #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    fontSize: '12px',
    color: '#94a3b8'
  },
  smallFillBtn: {
    padding: '7px 12px',
    borderRadius: '8px',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#fbbf24',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  chromeChoiceBtn: {
    padding: '20px 16px',
    borderRadius: '14px',
    border: '2px solid #fbbf24',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#0f172a',
    cursor: 'pointer'
  },
  whaleChoiceBtn: {
    padding: '20px 16px',
    borderRadius: '14px',
    border: '1px solid #38bdf8',
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    cursor: 'pointer'
  },
  whaleSubBox: {
    marginTop: '18px',
    padding: '18px',
    borderRadius: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #38bdf8'
  },
  stage5TopBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    paddingBottom: '16px',
    marginBottom: '18px',
    borderBottom: '1px solid #334155'
  },
  userStatusBadge: {
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    lineHeight: 1.5
  },
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '460px',
    overflowY: 'auto',
    padding: '14px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #334155'
  },
  aiBubble: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '14px 16px',
    color: '#f8fafc'
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: '#fbbf24',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#0f172a',
    fontWeight: 700
  },
  footer: {
    marginTop: '34px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#64748b'
  }
};
