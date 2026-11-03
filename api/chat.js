/**
 * SAFETY CONSULTING 안전 관제탑 Ver 2004 - Next.js API Route (api/chat.js) 완본
 * 작성 일자: 2026년 11월 3일 14시
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: '허용되지 않는 요청 방식입니다. (POST만 가능)' });
  }

  const GAS_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || process.env.APPS_SCRIPT_URL || '';
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || 'ASK_AI').toUpperCase().trim();

    // 1. 3-1 이메일 조회, 3-2 등급 신청, 3-3 키 인증은 Google Apps Script(관리대장 기초)와 직통 통신
    if (action === 'CHECK_EMAIL' || action === 'SUBMIT_STEP32' || action === 'VERIFY_KEY') {
      if (!GAS_URL) {
        return res.status(500).json({
          ok: false,
          error: '서버 환경변수(APPS_SCRIPT_URL)가 설정되지 않았습니다.'
        });
      }

      const gasRes = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        redirect: 'follow'
      });

      const text = await gasRes.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(502).json({
          ok: false,
          error: '구글 시트 연동 응답 형식이 올바르지 않습니다.',
          detail: text.slice(0, 200)
        });
      }
      return res.status(200).json(data);
    }

    // 2. 5단계 AI 안전법규 자문 요청 처리 및 N·O열 쿼터 실시간 차감
    if (action === 'ASK_AI') {
      const { email, licenseKey, question } = body;
      if (!question || !String(question).trim()) {
        return res.status(400).json({ ok: false, error: '질문 내용을 입력해 주십시오.' });
      }

      // (1) 쿼터 차감 요청
      let quotaInfo = null;
      if (GAS_URL && email && licenseKey) {
        try {
          const qRes = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'DEDUCT_QUOTA', email, licenseKey }),
            redirect: 'follow'
          });
          quotaInfo = await qRes.json();
          if (!quotaInfo.ok) {
            return res.status(403).json({ ok: false, error: quotaInfo.error || '라이선스 한도 확인 실패' });
          }
        } catch (qErr) {
          console.error('Quota deduction error:', qErr);
        }
      }

      // (2) Gemini AI 안전 관제탑 프롬프트 호출
      if (!GEMINI_API_KEY) {
        return res.status(200).json({
          ok: true,
          answer: `[안전 관제탑 안내] 현재 AI API 키가 환경변수에 연결되지 않았습니다. 질문하신 내용("${question}")에 대해 산업안전보건법, 중대재해처벌법, 건설기술진흥법 기준 솔루션을 제공하려면 Vercel 환경변수 GEMINI_API_KEY를 확인해 주십시오.`,
          quotaInfo
        });
      }

      const systemPrompt =
        `당신은 산업안전보건 경력 20년 이상의 베테랑 전문가이자 '회사의 법적 리스크를 통제/지원하는 안전 관제탑 (Safety Consulting)' AI입니다. ` +
        `중대재해처벌법, 산업안전보건법, 산업안전보건기준에 관한 규칙, 건설기술진흥법, 전기공사업법, KOSHA GUIDE 등 20여 개 안전 관련 법규를 바탕으로 ` +
        `1차 답변에서는 핵심 법적 기준과 과태료/처벌 리스크 방어 요점을 명확히 제시하고, 현장 소장 및 경영책임자가 즉시 실행할 수 있는 실무 솔루션을 제공하십시오.`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const aiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n[질문]: ${question}` }] }]
        })
      });

      const aiData = await aiRes.json();
      const answer =
        aiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
        '답변을 생성하는 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주십시오.';

      return res.status(200).json({
        ok: true,
        answer,
        quotaInfo
      });
    }

    return res.status(400).json({ ok: false, error: '지원하지 않는 요청입니다.' });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: '서버 내부 오류가 발생했습니다: ' + error.message
    });
  }
}
