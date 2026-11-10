"use client";
/**
 * SAFETY CONSULTING 안전 관제탑 Ver 2008 (최종 결함 핀셋 수리 완본)
 * - 기존 UI/디자인 100% 원본 사수
 * - 3-1 이메일 입력란 자동채움(남의 이메일 잔류) 제거 (무조건 빈칸 시작)
 * - 3-2 사업자등록번호/휴대폰번호 100% 자동 호출 및 '기초관리대장' 6행부터 즉시 인입
 * - 3-3 엉뚱한 2차 메일 안내 배너 제거 및 하단 마스터키 노출 박스 완전 삭제
 * - 3-2, 3-3, 4단계 전 구간 '← 이전' 버튼 일괄 적용
 * - 4단계 완료 시 가짜 채팅창 대신 정식 본 앱(MAIN_APP_URL)으로 즉시 이동
 */
import React, { useState, useEffect } from 'react';

// ★ [1] 4단계 통과 후 이동할 '정식 구동 메인 앱' 주소 (나중에 도메인 변경 시 여기만 수정)
const MAIN_APP_URL = "https://safety-consulting-kqgfabvym-pilot-7df3.vercel.app/index.html";

// ★ [2] 동진 님만 알고 계실 '비공개 프리패스 마스터키' (화면에는 절대 노출 안 됨 / 3-3 입력창에 타이핑 시 즉시 통과)
const MASTER_KEYS = [
  "ST26-XSSP-NPHB",
  "MASTER-2026-DONGJIN",
  "MASTER-DJ2026-CONTROL-9999",
  "ADMIN-PASS-9999",
  "1111"
];

// ★ [3] 동진 님의 Apps Script 배포 URL (Apps Script에서 새 배포 시 바뀐 URL이 있다면 아래 큰따옴표 안에 넣어주세요)
const DEFAULT_GAS_URL =
  "https://script.google.com/macros/s/AKfycbz2bI7Zwr1ntnV3r_0QAbs8mYI8qI5QCgZQ9kEe83gv2ZyBPNGCn5aRJ45RBAAt9ojo3Q/exec";
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

export default function SafetyControlTowerVer2008() {
  const [mainStage, setMainStage] = useState<number>(3); // 3: 3단계 관문, 4: 브라우저 점검, 5: 본 앱 입장 안내
  const [subStep, setSubStep] = useState<string>('3-1'); // '3-1', '3-2', '3-3'
  const [loading, setLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 3-1 이메일 입력 상태 (무조건 빈칸으로 시작!)
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

  // 3-3 라이선스 키 수동 입력 상태 (무조건 빈칸으로 시작!)
  const [inputLicenseKey, setInputLicenseKey] = useState<string>('');
  const [verifiedUser, setVerifiedUser] = useState<any>(null);
  const [whaleGuideOpen, setWhaleGuideOpen] = useState<boolean>(false);

  // 5단계 안내 카드로 이동하는 함수
  const goToStep5 = () => {
    setNotice('');
    setErrorMsg('');
    setMainStage(5);
  };

  // 정식 본 앱으로 즉시 이동하는 함수
  const redirectToMainApp = () => {
    window.location.href = MAIN_APP_URL;
  };

  // URL 파라미터(?step=3&email=...) 처리 (브라우저 로컬스토리지의 타인 이메일 자동 채움 완전 제거!)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get('step');
      const emailParam = params.get('email');

      // 이메일 링크를 클릭해서 들어온 경우에만 해당 이메일 세팅, 일반 접속 시에는 무조건 빈칸("") 유지
      if (emailParam) {
        const cleanParamEmail = emailParam.trim();
        setInputEmail(cleanParamEmail);
        setApplicant((prev) => ({ ...prev, email: cleanParamEmail }));
      } else {
        setInputEmail('');
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

  // [STEP 3-1] 신청자 이메일 조회 -> 2단계 설문 데이터(사업자번호/휴대폰 포함) 100% 자동 호출
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

        // 최상위 data와 하위 info 양쪽 모두에서 사업자번호(bizNo)와 휴대폰번호(phone) 누락 없이 확보
        const resolvedBizNo = String(info.bizNo || data.bizNo || '개인').trim();
        const resolvedPhone = String(info.phone || data.phone || '').trim();

        const updatedApplicant = {
          name: info.name || data.name || '고객',
          company: info.company || data.company || '개인',
          bizNo: resolvedBizNo,
          phone: resolvedPhone,
          email: cleanEmail,
          role: info.role || data.role || '직무: 안전보건 관리책임자',
          tier: loadedTier,
          period: loadedPeriod,
          contactMethod: info.contactMethod || data.contactMethod || '이메일',
          depositor: info.depositorName || info.name || data.name || ''
        };

        setApplicant(updatedApplicant);
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

  // [STEP 3-2] 구독 등급 및 기간 확인 완료 -> 기초관리대장 100% 자동 인입 & 2차 메일 발송
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
        setErrorMsg(resultData.error || '기초관리대장 저장 중 오류가 발생했습니다.');
        setLoading(false);
        return;
      }

      // 3-3 단계 진입 시 상단에 불필요한 2차 메일 발송 문구가 남아있지 않도록 배너 비움
      setNotice('');
      setErrorMsg('');
      setSubStep('3-3');
    } catch (err) {
      try {
        const queryStr = new URLSearchParams(payload as Record<string, string>).toString();
        await fetch(`${SCRIPT_URL}?${queryStr}&_t=${Date.now()}`, { method: 'GET', mode: 'no-cors' });
      } catch (e2) {}

      setNotice('');
      setErrorMsg('');
      setSubStep('3-3');
    } finally {
      setLoading(false);
    }
  };

  // [STEP 3-3] 라이선스 키 수동 입력 검증 (마스터키는 서버 통신 전 즉시 프리패스!)
  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');

    const cleanKey = inputLicenseKey.trim().toUpperCase();
    if (!cleanKey) {
      setErrorMsg('이메일로 발송된 <라이선스 키>를 입력해 주십시오.');
      return;
    }

    // ★ 1순위: 동진 님 전용 비공개 마스터키 입력 시 시트 조회 기다리지 않고 즉시 4단계로 프리패스!
    if (MASTER_KEYS.map((k) => k.toUpperCase()).includes(cleanKey)) {
      localStorage.setItem('sct_license_key', cleanKey);
      document.cookie = `sct_license_key=${cleanKey}; path=/; max-age=31536000`;
      setVerifiedUser({
        name: applicant.name || '동진 님 (마스터)',
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

      setErrorMsg(data.error || '유효하지 않은 라이선스 키이거나 아직 승인 대기 중입니다.');
    } catch (err) {
      setErrorMsg('라이선스 검증 서버와 통신 중 지연이 발생했습니다. 다시 시도해 주십시오.');
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = PLAN_DATA[applicant.tier] || PLAN_DATA.STANDARD;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* 상단 헤더 배너 */}
        <header style={styles.header}>
          <div style={styles.topBadgeRow}>
            <span style={styles.goldBadge}>
              SAFETY CONSULTING APP • 요리가 완료되어 바로 드실 수 있는 &lt;밀 키트&gt; 제공용
            </span>
            <div style={styles.stageQuickLinks}>
              <button
                type="button"
                onClick={() => { setNotice(''); setErrorMsg(''); setMainStage(3); setSubStep('3-1'); }}
                style={mainStage === 3 && subStep === '3-1' ? styles.navPillActive : styles.navPill}
              >
                3-1. 이메일 확인
              </button>
              <button
                type="button"
                onClick={() => { setNotice(''); setErrorMsg(''); setMainStage(3); setSubStep('3-2'); }}
                style={mainStage === 3 && subStep === '3-2' ? styles.navPillActive : styles.navPill}
              >
                3-2. 구독신청·입금
              </button>
              <button
                type="button"
                onClick={() => { setNotice(''); setErrorMsg(''); setMainStage(3); setSubStep('3-3'); }}
                style={mainStage === 3 && subStep === '3-3' ? styles.navPillActive : styles.navPill}
              >
                3-3. 라이선스 키 입력
              </button>
              <button
                type="button"
                onClick={() => { setNotice(''); setErrorMsg(''); setMainStage(4); }}
                style={mainStage === 4 ? styles.navPillActive : styles.navPill}
              >
                4단계. 브라우저 선택
              </button>
              <button
                type="button"
                onClick={() => { setNotice(''); setErrorMsg(''); setMainStage(5); }}
                style={mainStage === 5 ? styles.navPillActive : styles.navPill}
              >
                5단계. 안전관제탑 본 앱
              </button>
            </div>
          </div>

          <h1 style={styles.mainHeading}>
            우리 회사의 안전 해결사 <span style={{ color: '#fbbf24' }}>&lt; 안전 관제탑 &gt;</span>
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
                    name="sct_applicant_email"
                    autoComplete="off"
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

                    {/* 무통장 입금 계좌 및 필수 안내문구 */}
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
                        onClick={() => { setNotice(''); setErrorMsg(''); setSubStep('3-1'); }}
                        style={styles.backBtn}
                      >
                        ← 이전
                      </button>
                      <button type="submit" disabled={loading} style={{ ...styles.goldSubmitBtn, flex: 1, marginTop: 0 }}>
                        {loading ? '기초관리대장 인입 및 이메일 발송 중...' : '구독신청 완료 및 3-3 단계로 이동 →'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 3-3 단계: 라이선스 키 입력 (하단 마스터키 노출 완전 제거 & '← 이전' 버튼 추가) */}
            {subStep === '3-3' && (
              <div style={styles.singleCardWrap}>
                <div style={styles.stepTag}>우리 회사의 안전 해결사 &lt; 안전 관제탑 &gt; • STEP 3-3</div>
                <h2 style={styles.cardTitle}>
                  우리 회사의 안전 해결사 &lt; 안전 관제탑 &gt;
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
                    name="sct_license_key_input"
                    autoComplete="off"
                    value={inputLicenseKey}
                    onChange={(e) => setInputLicenseKey(e.target.value)}
                    placeholder="예: ST26-XXXX-XXXX"
                    style={{ ...styles.textInput, fontSize: '18px', fontWeight: 800, letterSpacing: '1px' }}
                    required
                  />

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => { setNotice(''); setErrorMsg(''); setSubStep('3-2'); }}
                      style={styles.backBtn}
                    >
                      ← 이전
                    </button>
                    <button type="submit" disabled={loading} style={{ ...styles.goldSubmitBtn, flex: 1, marginTop: 0 }}>
                      {loading ? '라이선스 키 인증 확인 중...' : '라이선스 키 입력 완료 (4단계로 진입) →'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            [MAIN STAGE 4] 4단계 크롬/엣지 vs 네이버 웨일 브라우저 확인 팝업
            (통과 시 5단계 안내 화면으로 이동 + 하단 '← 이전' 버튼 추가)
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
                onClick={goToStep5}
                style={styles.chromeChoiceBtn}
              >
                <div style={{ fontSize: '17px', fontWeight: 800 }}>🎙️ 네, 맞아요! (크롬 / 엣지 사용 중)</div>
                <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.9 }}>
                  원활한 음성+문자 입력 지원 → 정식 본 화면 즉시 진입
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
                    const targetUrl = window.location.search 
                   ? window.location.href 
                    : `${window.location.origin}${window.location.pathname}?email=${encodeURIComponent(applicant.email || '')}`;

                  navigator.clipboard.writeText(targetUrl);
                      setNotice('정식 본 앱 주소가 복사되었습니다. 크롬 브라우저 주소창에 붙여넣기 해주세요.');
                    }}
                    style={styles.backBtn}
                  >
                    📋 크롬으로 변경할래요 (주소 복사)
                  </button>
                  <button
                    type="button"
                    onClick={goToStep5}
                    style={{ ...styles.goldSubmitBtn, width: 'auto', marginTop: 0, padding: '12px 24px' }}
                  >
                    ⌨️ 문자입력 모드로 계속하기 (정식 본 앱 진입) →
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => { setNotice(''); setErrorMsg(''); setMainStage(3); setSubStep('3-3'); }}
                style={styles.backBtn}
              >
                ← 이전 (3-3 라이선스 키 입력 단계로)
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            [MAIN STAGE 5] 5단계 안전관제탑 구독자 전용 본 앱 입장 안내 카드
        ===================================================================== */}
        {mainStage === 5 && (
          <div style={styles.singleCardWrap}>
            <div style={styles.stepTag}>STEP 5 • 안전관제탑 정식 본 앱 입장</div>
            <h2 style={styles.cardTitle}>
              우리 회사의 안전 해결사 <span style={{ color: '#fbbf24' }}>&lt; 안전 관제탑 &gt;</span> 준비 완료!
            </h2>
            <p style={styles.cardDesc}>
              라이선스 키 인증 및 브라우저 환경 점검이 모두 완료되었습니다.
              <br />
              아래 버튼을 클릭하시면 <strong>&lt;구독자 전용 앱 첫 화면&gt;</strong>으로 즉시 이동합니다.
            </p>

            {verifiedUser && (
              <div style={{ ...styles.keyNoticeBox, marginTop: '18px', marginBottom: '18px' }}>
                ✓ 인증 구독자: <strong>{verifiedUser.name}</strong> ({verifiedUser.company}) • 등급: <strong style={{ color: '#fbbf24' }}>{verifiedUser.tier}</strong> ({verifiedUser.period})
              </div>
            )}

            <div style={{ marginTop: '22px' }}>
              <button
                type="button"
                onClick={redirectToMainApp}
                style={styles.goldSubmitBtn}
              >
                🚀 안전관제탑 구독자 전용 본 앱 실행하기 →
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setNotice(''); setErrorMsg(''); setMainStage(4); }}
                style={styles.backBtn}
              >
                ← 이전 (4단계 브라우저 선택으로)
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(MAIN_APP_URL);
                  setNotice('구독자 전용 본 앱 주소가 복사되었습니다. 크롬 주소창에 붙여넣기 해주세요.');
                }}
                style={styles.backBtn}
              >
                📋 본 앱 주소 복사하기 (크롬창 붙여넣기용)
              </button>
            </div>
          </div>
        )}

        <footer style={styles.footer}>
          우리 회사의 안전 해결사 &lt; 안전 관제탑 &gt; | SAFETY CONSULTING APP (20년 안전관리 전문가 솔루션)
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
  footer: {
    marginTop: '34px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#64748b'
  }
};
