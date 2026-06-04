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

  try {
    const { model, contents, generationConfig, purpose } = request.body;

    if (!model || !contents) {
      return response.status(400).json({ error: 'model과 contents는 필수입니다.' });
    }

    // Vercel 프로젝트 설정의 환경변수에서 용도에 맞는 API 키를 선택합니다.
    let API_KEY = process.env.GEMINI_API_KEY;
    if (purpose === 'generate') {
      API_KEY = process.env.GEMINI_GEN_API_KEY || process.env.GEMINI_API_KEY;
    } else if (purpose === 'eval') {
      API_KEY = process.env.GEMINI_EVAL_API_KEY || process.env.GEMINI_API_KEY;
    }

    if (!API_KEY) {
      return response.status(500).json({ error: 'API 키가 설정되지 않았습니다. Vercel 환경변수를 확인해 주세요.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    const maxRetries = 3;
    let attempt = 0;
    let apiResponse;
    let data;
    let lastError = null;

    while (attempt < maxRetries) {
      try {
        apiResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
              ...generationConfig,
              thinkingConfig: {
                thinkingBudget: (generationConfig?.thinkingConfig && typeof generationConfig.thinkingConfig.thinkingBudget === 'number')
                  ? generationConfig.thinkingConfig.thinkingBudget
                  : 2048
              }
            }
          })
        });

        data = await apiResponse.json();

        if (apiResponse.ok) {
          return response.status(200).json(data);
        }

        // 에러 상태 분석
        const status = apiResponse.status;
        const errMsg = data.error?.message || '';
        lastError = { error: errMsg, status };

        // 재시도가 필요한 에러 조건 체크 (429, 503, Overloaded, Quota 등)
        const isRateLimitOrOverload = status === 429 || status === 503 || 
                                     errMsg.toLowerCase().includes('overloaded') || 
                                     errMsg.toLowerCase().includes('quota') ||
                                     errMsg.toLowerCase().includes('high demand') ||
                                     errMsg.toLowerCase().includes('resource');

        if (isRateLimitOrOverload && attempt < maxRetries - 1) {
          attempt++;
          const waitTime = Math.pow(2, attempt) * 1000; // 2초, 4초
          console.warn(`[Gemini Proxy] Attempt ${attempt} failed. Status: ${status}. Retrying in ${waitTime}ms... Reason: ${errMsg}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        break;
      } catch (fetchErr) {
        lastError = { error: fetchErr.message || 'Network Fetch Error', status: 500 };
        if (attempt < maxRetries - 1) {
          attempt++;
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(`[Gemini Proxy] Fetch error on attempt ${attempt}. Retrying in ${waitTime}ms... Error: ${fetchErr.message}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        break;
      }
    }

    return response.status(lastError.status).json({
      error: lastError.error || 'Gemini API 호출에 최종 실패했습니다.',
      status: lastError.status
    });
  } catch (error) {
    return response.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
  }
}
