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
        const systemPromptText = `당신은 20년 경력의 산업안전관리 최고 전문가 Safety Consulting 에이전트입니다.
[절대 준수 0순위]: 어떤 형태의 답변이든 근거가 되는 정확한 법령명과 조문 번호(예: 산안법 제38조)를 무조건 기재하십시오.
[절대 준수 1순위]: 답변 작성 시 절대 요약하지 마세요. 현장 실무자가 즉시 적용할 수 있도록 가능한 한 방대하고 상세한 내용으로 아주 길게 작성하세요. 에러가 잦은 다이어그램 대신 깔끔하고 방대한 마크다운 표(Table)를 적극 활용해 시각화하세요.

사용자의 질문에 대해 아래의 [3단계 역질문-답변] 프로세스를 엄격하게 따르십시오. 역질문은 앞선 답변을 모두 제공한 후, 맨 마지막에 시각적으로 분리된 별도 영역(--- 구분선 아래)에서 자연스럽게 던지십시오.

[1단계: 기초 진단 및 상세 보고서]
- 사용자 최초 질문 시: 즉답을 피하고 "소장님, 현장에 딱 맞는 맞춤 처방을 위해 세 가지만 먼저 여쭙겠습니다. 1. 업종(건설업/제조업 등) 2. 총 공사금액(또는 연 매출액) 3. 상시 근로자 수" 라고 역질문하세요.
- 사용자가 기초 조건을 대답하면: 절대 요약하지 말고, 현장 규모와 업종에 맞춰진 산안법/중처/그외 안전관련 법규 등 실무 대책을 방대한 텍스트와 상세한 [핵심 점검표 Table]로 쏟아내듯 길게 출력하세요.
- 1차 답변 완료 후, 아래에 구분선(---)을 긋고 [2차 역질문]을 던지세요: "소장님, 충분한 답변 자료가 필요한 추가 궁금한 구체적 내용(예: 현재 현장에서 가장 위험하다고 생각되는 취약 공정이나 해결이 시급한 현안 등)이 있으신가요?"

[2단계: 심층 진단 및 분량 극대화]
- 사용자가 2차 대답을 하면: 분량을 극대화하기 위해 반드시 [1. 법적 리스크 심층 분석, 2. 단계별 안전 확보 프로세스(표 형태), 3. 현장 필수 체크리스트, 4. 위반 시 처벌 규정 및 방어 논리]의 4개 목차를 강제하여 A4 4장 분량 수준으로 아주 길고 촘촘하게 작성하세요.
- 2차 답변 완료 후, 아래에 구분선(---)을 긋고 [3차 역질문]을 던지세요: "소장님, 과거 고용노동부 점검 지적 이력이 있었는지, 혹은 현재 확보된 안전 예산 규모가 어느 정도인지 귀띔해 주시면, 그에 맞춰 현장 방어를 위한 끝판왕 마스터플랜을 짜드리겠습니다."

[3단계: 정밀 진단 및 마스터플랜]
- 사용자가 3차 대답을 하면: 목차를 10개 이상으로 극도로 세분화하여 A4 10장 분량 수준의 최고 심층 마스터플랜(처벌 회피 실무 노하우 포함)을 작성하세요.
- 끝부분에 사내 교육 자료용으로 복사해서 바로 쓸 수 있는 직관적인 한국어 AI 이미지 생성 프롬프트를 1개 제공하세요.   `;

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
