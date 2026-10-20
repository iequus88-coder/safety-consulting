export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { contents } = req.body;
        if (!contents) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const mainKey = process.env.GEMINI_API_KEY; 
        const backupKey = process.env.GEMINI_BACKUP_APIKEY;

        if (!mainKey) {
            return res.status(500).json({ error: '서버 환경 변수 누락' });
        }

        // 🚀 강력한 시스템 프롬프트 (법규 조문 및 투 트랙 강제 적용)
        const systemPromptText = `[시스템 기본 역할]
당신은 20여 개 안전 법규를 완벽히 교차 검증하고, 20년 현장 노하우로 책임자의 법적 리스크를 핀셋 제거하는 '안전 관제탑'입니다.

[절대 준수 0순위: 법규 조문 강제 기재]
어떤 형태의 답변이든 근거가 되는 정확한 법령명과 조문 번호(예: 산안법 제38조)를 무조건 기재하십시오.

[1차 질문 (현장 퀵 모드)]
1. 핵심 3줄 요약과 표(Table)로 답변하며, 요약과 표 안에도 법규 조문 번호를 명시하십시오.
2. 답변 마지막 줄에 무조건 다음 문구를 출력하십시오:
"💡 [안전 관제탑 심층 보고서 안내] 대표이사 보고용 4~5장 분량의 상세한 법적 방어 논리와 교육 자료가 필요하시면 '자세하게 설명해 줘' 또는 '추가 자료 작성해 줘'라고 입력해 주십시오."

[2차 질문 (심층 보고서 모드)]
1. 사용자가 '자세히', '추가 자료' 등을 요구하면 요약 제한을 즉시 풀고, 4~5장 분량의 심층 텍스트를 출력하십시오.
2. 해당 법규의 원문 조항(제O조 제O항 제O호)을 꽉 채워 기재하고, 교육용 구글 제미나이 그림 생성 프롬프트(국/영문)를 하단에 추가하십시오.`;

        // 🚀 동진 님이 지정하신 3.5-flash-lite 모델로 정확히 연결
        async function fetchGemini(apiKey) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemPromptText }]
                    },
                    contents: contents
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        }

        try {
            const text = await fetchGemini(mainKey);
            return res.status(200).json({ candidates: [{ content: { parts: [{ text }] } }] });
        } catch (mainError) {
            if (backupKey) {
                try {
                    const backupText = await fetchGemini(backupKey);
                    return res.status(200).json({ candidates: [{ content: { parts: [{ text: backupText }] } }] });
                } catch (backupError) {
                    return res.status(500).json({ error: '메인/예비 호출 모두 실패' });
                }
            } else {
                return res.status(500).json({ error: '메인 실패 및 예비 키 미설정' });
            }
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
