// Vercel Serverless Function - Gemini API Proxy
// API 키를 서버 측에서 안전하게 관리합니다.

export default async function handler(request, response) {
  // CORS 헤더 설정
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // CORS preflight 요청 처리
  if (request.method === 'OPTIONS') {
    return response.status(204).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // Vercel 프로젝트 설정의 환경변수에서 API 키를 읽어옵니다.
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return response.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  try {
    const { model, contents, generationConfig } = request.body;

    if (!model || !contents) {
      return response.status(400).json({ error: 'model과 contents는 필수입니다.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: generationConfig || { temperature: 0.7, maxOutputTokens: 8192 }
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return response.status(apiResponse.status).json({
        error: data.error?.message || `Gemini API 오류 (${apiResponse.status})`,
        status: apiResponse.status
      });
    }

    return response.status(200).json(data);
  } catch (error) {
    return response.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
  }
}
