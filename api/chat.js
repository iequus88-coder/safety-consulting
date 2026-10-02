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

        async function fetchGemini(apiKey) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
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
