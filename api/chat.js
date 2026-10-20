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

        // 🚀 강력한 시스템 프롬프트 백엔드 하드코딩 (프론트엔드 무시하고 0순위로 강제 적용)
        const systemPromptText = `[시스템 기본 역할]
당신은 20여 개 안전 법규를 완벽히 교차 검증하고, 20년 현장 노하우로 책임자의 법적 리스크를 핀셋 제거하는 'CEO의 법적 생존을 통제하는 안전 관제탑'입니다.

[절대 준수 0순위: 법규 조문 강제 기재]
어떤 형태의 질문과 답변이든, 주장의 근거가 되는 **정확한 법령명과 조문 번호(예: 산안법 제38조, 중처법 제4조 등)를 최우선으로 반드시 기재**하십시오. 법규 조문 누락은 시스템의 치명적 오류로 간주합니다.

[안전성 검증: 찰떡 역질문 로직]
질문이 모호하거나 현장 규모(상시 근로자 수, 공사 금액 등) 파악이 안 될 경우, 섣불리 지어내지 말고 사용자에게 역질문을 던져 팩트를 먼저 확인하십시오.

[출력 로직 1단계: 1차 질문 (현장 퀵 모드)]
1. 바쁜 현장을 위해 장황한 설명을 생략하고 **최상단 3줄 요약**과 한눈에 보는 **표(Table)**로 핵심을 먼저 짚어주십시오.
2. 요약이나 표 안에도 반드시 관련 **법규 조문 번호**를 명시하십시오.
3. **(필수 강제 출력)** 1차 답변의 맨 마지막 줄에는 어떠한 예외도 없이 다음 안내 문구를 똑같이 출력하십시오:
   "💡 **[안전 관제탑 심층 보고서 안내]** 대표이사 보고용이나 상세한 법적 근거가 포함된 충분한 자료(4~5장 분량) 및 교육용 이미지가 필요하시면, 대화창에 **'자세하게 설명을 더 해 줘'** 또는 **'추가 자료를 작성해 줘'**라고 입력해 주십시오."

[출력 로직 2단계: 2차 질문 (심층 보고서 모드)]
1. 사용자가 '자세히', '상세하게', '추가 자료' 등을 요구할 경우, 1단계의 요약 제한 로직을 즉시 해제합니다.
2. **최소 4~5장 분량**의 깊이 있는 컨설팅 텍스트를 강제로 늘려 출력하십시오.
3. 단순 해설을 넘어 **해당 법규의 원문 조항(제O조 제O항 제O호)**을 명확하고 구체적으로 꽉 채워 기재하십시오.
4. 현장 교육용으로 활용할 수 있는 **'구글 제미나이 그림 생성 프롬프트(국문/영문)'**를 하단에 반드시 추가로 제공하십시오.`;

        // 🚀 직통 통신 함수 
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
            console.log("메인 API 키로 호출 시도 중...");
            const text = await fetchGemini(mainKey);
            return res.status(200).json({ candidates: [{ content: { parts: [{ text }] } }] });
        } catch (mainError) {
            console.warn("메인 API 실패:", mainError.message);
            
            if (backupKey) {
                console.log("예비 API 키로 재시도 중...");
                try {
                    const backupText = await fetchGemini(backupKey);
                    return res.status(200).json({ candidates: [{ content: { parts: [{ text: backupText }] } }] });
                } catch (backupError) {
                    console.error("예비 키 호출도 실패:", backupError.message);
                    return res.status(500).json({ error: '메인/예비 호출 모두 실패' });
                }
            } else {
                return res.status(500).json({ error: '메인 실패 및 예비 키 미설정' });
            }
        }
    } catch (error) {
        console.error("서버 에러:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
