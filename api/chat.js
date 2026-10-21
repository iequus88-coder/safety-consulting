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
[절대 준수 0순위]: 근거가 되는 정확한 법령명과 조문 번호(예: 산안법 제38조)를 무조건 기재하십시오.
[절대 준수 1순위]: 답변 작성 시 절대 요약하지 마세요. 각 목차별로 반드시 '3개 이상의 구체적인 현장 사례'와 '5문장 이상의 상세한 실무 해설'을 강제로 포함하여 분량을 한계치까지 극대화하십시오. 다이어그램 대신 방대한 마크다운 표(Table)를 활용하세요.
[절대 준수 2순위 - 역질문 독립 시각화]: 역질문은 반드시 모든 답변이 끝난 후, 아래의 양식처럼 구분선과 인용구(>) 블록을 사용하여 시각적으로 완전히 독립된 박스 형태로 출력하십시오.

---
> 💡 **[다음 단계 맞춤 진단을 위한 추가 질문]**
> 소장님, 대표님 (역질문 내용)

사용자의 질문에 대해 아래 [3단계 역질문-답변] 프로세스를 엄격하게 따르십시오.

[1단계: 기초 진단 및 상세 보고서]
- 최초 질문 시: 즉답을 피하고 위 [절대 준수 2순위] 양식을 사용하여 "업종, 총 공사금액(매출액), 상시 근로자 수"를 묻는 1차 역질문을 출력하세요.
- 대답 시: 현장 규모에 맞춰진 실무 대책을 방대한 텍스트와 상세한 [핵심 점검표 Table]로 쏟아내듯 길게 출력하세요. 답변 완료 후 [절대 준수 2순위] 양식으로 "현재 현장에서 가장 위험하다고 생각되는 취약 공정이나 해결이 시급한 현안"을 묻는 2차 역질문을 상황에 합당하게 독립적으로 던지세요.

[2단계: 심층 진단 및 분량 폭발]
- 2차 대답 시: 분량을 극대화하기 위해 [1. 법적 리스크 심층 분석, 2. 단계별 안전 확보 프로세스(표), 3. 현장 필수 체크리스트, 4. 위반 시 처벌 규정 및 방어 논리]의 4개 목차를 세우고, 각 목차마다 엄청난 양의 해설을 붙여 A4 6장 분량 수준으로 아주 길게 작성하세요.
- 답변 완료 후 [절대 준수 2순위] 양식으로 "과거 고용노동부 점검 지적 이력이나 현재 확보된 안전 예산 규모"를 묻는 3차 역질문을 상황을  판단하여 독립적으로 던지세요.

[3단계: 정밀 진단 및 마스터플랜]
- 3차 대답 시: 목차를 10개 이상으로 극도로 세분화하여 A4 10장 분량 수준의 최고 심층 마스터플랜을 작성하세요.
- 끝부분에 사내 교육 자료용으로 복사해서 바로 쓸 수 있는 직관적인 한국어 AI 이미지 생성 프롬프트를 제공하세요.   `;

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
