export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 요청 방식입니다. (POST만 가능)' });
  }

  const { action, messages, email, tier, licenseKey } = req.body;
  const GAS_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || process.env.APPS_SCRIPT_URL || '';

  // ===== 1. 관문(Gate) 인증 연동 처리 (GAS 연동 및 자체 프리패스 폴백) =====
  if (action === 'VERIFY_EMAIL' || action === 'SELECT_TIER' || action === 'VERIFY_KEY') {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 마스터 이메일은 무조건 즉시 승인
    if (cleanEmail === 'iecus88@gmail.com' || cleanEmail === 'admin@safety.com') {
      return res.status(200).json({
        success: true,
        name: '정동진 대표님 (마스터)',
        tier: 'ULTRA'
      });
    }

    // 구글 앱스 스크립트(GAS) URL이 설정되어 있으면 통신 시도
    if (GAS_URL) {
      try {
        const gasRes = await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, email: cleanEmail, tier, licenseKey })
        });
        const gasData = await gasRes.json();
        return res.status(200).json(gasData);
      } catch (err) {
        // GAS 통신 장애 시에도 앱 진입이 막히지 않도록 안전 통과 처리
        return res.status(200).json({
          success: true,
          name: cleanEmail.split('@')[0] || '고객',
          tier: tier || 'TRIAL'
        });
      }
    }

    // GAS 미설정 시 기본 통과 응답
    return res.status(200).json({
      success: true,
      name: cleanEmail.split('@')[0] || '고객',
      tier: tier || 'TRIAL'
    });
  }

  // ===== 2. 메인 AI 안전 컨설팅 대화(CHAT) 처리 =====
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Vercel 환경변수에 GEMINI_API_KEY가 설정되어 있지 않습니다. Vercel Settings -> Environment Variables를 확인해 주십시오.'
    });
  }

  // 20년 경력 산업안전 전문가 시스템 프롬프트 (풍부한 분량 + 법령 근거 + 역질문 필수)
  const SYSTEM_PROMPT = `당신은 대한민국 산업안전 분야에서 20년 이상의 현장 실무 및 법규 컨설팅 경력을 보유한 최고 권위의 전문가 'Safety Consulting'입니다.
질문자는 건설현장 소장, 안전관리자, 태양광 발전 시공 관리자, 또는 기업 경영책임자(CEO)입니다.

[핵심 답변 원칙]
1. 관련 법령의 정확한 명시: 산업안전보건법, 산업안전보건기준에 관한 규칙, 중대재해처벌법, 건설기술진흥법, 전기공사업법, KOSHA GUIDE 등 해당 사안에 적용되는 정확한 법조문과 기준을 명확히 제시하십시오.
2. 실무 중심의 입체적 대책: 단순한 이론 나열이 아니라 현장에서 즉시 적용 가능한 '기술적 대책(안전시설물·보호구)', '관리적 대책(작업계획서·점검표·TBM)', '교육적 대책'으로 구분하여 풍부하고 상세하게 작성하십시오.
3. 가독성 극대화: 핵심 키워드는 **강조 표시**하고, 번호와 글머리 기호를 활용하여 현장에서 바로 인쇄해 안전 회의 자료나 점검 보고서로 쓸 수 있을 만큼 품격 있고 체계적으로 작성하십시오.
4. 맞춤형 심층 역질문(필수): 답변의 맨 마지막 단락에는 반드시 [💡 맞춤형 심층 컨설팅을 위한 추가 확인 사항]이라는 소제목을 달고, 현재 현장의 구체적인 여건(예: 공사 금액/용량, 지붕 형태 및 높이, 작업 인원, 원·하청 계약 구조 등)을 묻는 날카로운 역질문 2~3가지를 제시하여 다음 대화를 이끌어 가십시오.`;

  try {
    // 대화 내역을 Gemini API 포맷으로 변환
    const formattedContents = (messages || []).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // 가용 모델 순차 폴백 리스트 (환경변수 지정 모델 우선 -> 최신 안정 모델 순차 호출)
    const preferredModel = process.env.GEMINI_MODEL;
    const candidateModels = [
      preferredModel,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ].filter(Boolean);

    let replyText = '';
    let lastError = '';

    for (const modelName of candidateModels) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }]
            },
            contents: formattedContents,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 4096
            }
          })
        });

        const data = await response.json();

        if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          replyText = data.candidates[0].content.parts[0].text;
          break;
        } else {
          lastError = data?.error?.message || `모델(${modelName}) 응답 오류`;
        }
      } catch (innerErr) {
        lastError = innerErr.message;
      }
    }

    if (!replyText) {
      return res.status(500).json({
        error: `AI 모델 호출 실패: ${lastError}`
      });
    }

    return res.status(200).json({ reply: replyText });
  } catch (error) {
    return res.status(500).json({
      error: `서버 내부 오류가 발생했습니다: ${error.message}`
    });
  }
}
