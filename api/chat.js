export default async function handler(req, res) {
  // Vercel 금고(Environment Variables)에서 API 키를 안전하게 꺼내옵니다.
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: '서버 환경 변수에 GEMINI_API_KEY가 설정되지 않았습니다. Vercel Settings를 확인해주세요.' });
  }

  try {
    const bodyData = req.body;
    
    const payload = {
      contents: bodyData.contents,
      // 웹 검색이 필요할 수 있으므로 구글 검색 도구 활성화
      tools: [{ "google_search": {} }]
    };

    // 최신 안정형 모델인 gemini-3.5-flash 엔드포인트 적용
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || `Google API 오류 발생 (상태 코드: ${response.status})`;
      return res.status(500).json({ error: errorMsg });
    }

    // 성공 시 클라이언트(index.html) 화면으로 답변 데이터 전송
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('API 통신 치명적 에러:', error);
    return res.status(500).json({ error: '서버 내부 통신 중 오류가 발생했습니다: ' + error.message });
  }
}
