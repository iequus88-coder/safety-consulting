export default async function handler(req, res) {
    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { contents } = req.body;
        if (!contents) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        // Vercel 환경 변수에 설정된 2개의 API 키 가져오기
        const mainKey = process.env.GEMINI_API_KEY; 
        const backupKey = process.env.GEMINI_BACKUP_APIKEY;

        if (!mainKey) {
            return res.status(500).json({ error: '서버 환경 변수(메인 API 키) 누락' });
        }

        // 구글 부품 없이 '직접' 전화(Fetch)를 거는 핵심 함수
        async function fetchGemini(apiKey) {
            // 🚨 수정된 부분: 동진님 판단대로 가성비/속도 최강인 Flash 모델(gemini-1.5-flash)로 변경했습니다!
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Google API 에러: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        }

        try {
            console.log("메인 API 키 직통 연결 시도 중...");
            const text = await fetchGemini(mainKey);
            return res.status(200).json({ candidates: [{ content: { parts: [{ text }] } }] });

        } catch (mainError) {
            console.warn("메인 API 키 연결 실패:", mainError.message);
            
            if (backupKey) {
                console.log("예비 API 키로 전환하여 직통 연결 재시도 중...");
                try {
                    const backupText = await fetchGemini(backupKey);
                    return res.status(200).json({ candidates: [{ content: { parts: [{ text: backupText }] } }] });
                } catch (backupError) {
                    console.error("예비 키 호출도 실패:", backupError.message);
                    return res.status(500).json({ error: '메인/예비 API 호출 모두 실패' });
                }
            } else {
                return res.status(500).json({ error: '메인 API 실패 및 예비 키 미설정' });
            }
        }
    } catch (error) {
        console.error("서버 내부 에러:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
