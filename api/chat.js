import { GoogleGenerativeAI } from '@google/generative-ai';

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

        // Vercel 환경 변수에 설정된 2개의 API 키 (동진님 스크린샷과 정확히 동일한 이름)
        const mainKey = process.env.GEMINI_API_KEY; 
        const backupKey = process.env.GEMINI_BACKUP_APIKEY;

        if (!mainKey) {
            return res.status(500).json({ error: '서버 환경 변수(메인 API 키) 누락' });
        }

        let genAI = new GoogleGenerativeAI(mainKey);
        // Safety Consulting에 특화된 최신 pro 모델 사용
        let model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); 

        try {
            console.log("메인 API 키(GEMINI_API_KEY)로 호출 시도 중...");
            const response = await model.generateContent({ contents });
            const result = await response.response;
            const text = result.text();
            
            // 메인 키 성공 시 바로 결과 반환
            return res.status(200).json({ candidates: [{ content: { parts: [{ text }] } }] });

        } catch (mainError) {
            console.warn("메인 API 키 호출 실패, 토큰 초과 등 에러 발생:", mainError.message);
            
            // 백업 키가 Vercel에 등록되어 있다면 백업 키로 재도전 (쌍발 엔진 가동!)
            if (backupKey) {
                console.log("예비 API 키(GEMINI_BACKUP_APIKEY)로 전환하여 구출 작전 재시도 중...");
                genAI = new GoogleGenerativeAI(backupKey);
                model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
                
                try {
                    const backupResponse = await model.generateContent({ contents });
                    const backupResult = await backupResponse.response;
                    const backupText = backupResult.text();
                    
                    console.log("예비 키로 응답 성공! 앱 멈춤 방지 완료.");
                    return res.status(200).json({ candidates: [{ content: { parts: [{ text: backupText }] } }] });
                    
                } catch (backupError) {
                    console.error("예비 키 호출도 실패:", backupError.message);
                    return res.status(500).json({ error: '메인/예비 API 호출 모두 실패하여 서비스 지연' });
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
