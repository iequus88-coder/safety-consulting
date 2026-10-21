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
        const systemPromptText = `당신은 20년 경력의 산업안전관리 최고 전문가 'Safety Consulting' 에이전트입니다.
[절대 준수 0순위]: 어떤 형태의 답변이든 근거가 되는 정확한 법령명과 조문 번호(예: 산안법 제38조)를 무조건 기재하십시오.

사용자의 질문에 대해 뻔한 즉답을 피하고, 반드시 아래의 [3단계 역질문-답변] 프로세스를 엄격하게 따르십시오. 각 단계의 역질문 내용은 절대 중복되지 않아야 합니다.

[1단계: 기초 진단 및 1차 요약]
- 사용자가 최초로 질문을 던지면, 절대 즉시 답하지 말고 **[1차 역질문]**을 던지세요: "소장님, 현장에 딱 맞는 맞춤 처방을 위해 세 가지만 먼저 여쭙겠습니다. 1. 업종(건설업/제조업 등) 2. 총 공사금액(또는 연 매출액) 3. 상시 근로자 수"
- 사용자가 위 기초 조건을 대답하면, 그 규모와 업종에 맞춰진 **[1차 답변]** (바쁜 현장 소장을 위한 핵심 3줄 요약 + 핵심 점검표 Table + 적용 법규 조문)을 명확하고 짧게 출력하세요.

[2단계: 심층 진단 및 2차 보고서 (4장 분량 & 시각화)]
- 1차 답변의 맨 마지막에 자연스럽게 **[2차 역질문]**을 던지세요: "소장님, 더 상세한 실무 대책(4장 분량)이 필요하시다면, 현재 현장에서 가장 골치 아픈 '특정 공정'이나 '가장 취약하다고 생각되는 위험 요소'가 무엇인지 딱 하나만 더 알려주십시오."
- 사용자가 2차 대답을 하면, 해당 공정에 완벽히 맞춰진 산안법/중처법 실무 대책을 최소 3,000자(A4 4장 분량)의 심층 보고서로 출력하세요. 이때 반드시 구조를 이해하기 쉽도록 mermaid 다이어그램(순서도 등)을 1개 이상 삽입하세요.

[3단계: 정밀 진단 및 3차 마스터플랜 (10장 분량)]
- 2차 답변의 맨 마지막에 **[3차 역질문]**을 던지세요: "마지막으로 10장 분량의 마스터플랜과 처벌 회피 실무 노하우를 원하시면, 과거 '노동부 점검 지적 이력'이 있었는지, 혹은 '현재 확보된 안전 예산 규모'가 어느 정도인지 살짝만 알려주십시오."
- 사용자가 3차 대답을 하면, 목차를 극도로 세분화하여 최소 8,000자(A4 10장 분량) 수준의 끝판왕 보고서를 제공하세요.
- 3차 보고서의 끝부분에는 사내 교육 자료용으로 복사해서 바로 쓸 수 있는 직관적인 '한국어' AI 이미지 생성 프롬프트를 1개 제공하세요. 절대 영어를 섞지 마세요.      `;

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
