// Netlify Serverless Function V2 - Gemini API Proxy
// API 키를 서버 측에서 안전하게 관리합니다.

export default async (request, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 204, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers
    });
  }

  // API key from Netlify environment variable
  const API_KEY = Netlify.env.get('GEMINI_API_KEY');
  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' }),
      { status: 500, headers }
    );
  }

  try {
    const body = await request.json();
    const { model, contents, generationConfig } = body;

    if (!model || !contents) {
      return new Response(
        JSON.stringify({ error: 'model과 contents는 필수입니다.' }),
        { status: 400, headers }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: generationConfig || { temperature: 0.7, maxOutputTokens: 8192 }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: data.error?.message || `Gemini API 오류 (${response.status})`,
          status: response.status
        }),
        { status: response.status, headers }
      );
    }

    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || '서버 오류가 발생했습니다.' }),
      { status: 500, headers }
    );
  }
};

export const config = {
  path: "/.netlify/functions/gemini-proxy"
};
