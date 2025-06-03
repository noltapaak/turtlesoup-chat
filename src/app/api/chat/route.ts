import { NextRequest, NextResponse } from 'next/server';
import { Scenario } from '../../../data/scenarios'; // 시나리오 타입 경로 수정 필요 시 확인

export async function POST(req: NextRequest) {
  console.log('API Route /api/chat called'); // 함수 호출 로그
  try {
    const { prompt, scenario } = await req.json() as { prompt: string, scenario: Scenario };
    console.log('Received prompt:', prompt);
    console.log('Received scenario ID:', scenario?.id);

    if (!prompt || !scenario) {
      console.error('Missing prompt or scenario');
      return NextResponse.json({ error: 'Missing prompt or scenario' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set in Vercel environment variables');
      return NextResponse.json({ error: 'Server configuration error: API key not set' }, { status: 500 });
    }
    // console.log('Using OpenAI API Key (first 5 chars):', apiKey.substring(0, 5)); // 실제 키 일부 로그 (보안상 주의, 테스트 후 제거 권장)

    const systemMessage = `너는 추리 게임의 마스터야.\n시나리오: ${scenario.title}\n설명: ${scenario.description}\n정답: ${scenario.answer}`;

    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: prompt },
    ];

    console.log('Sending request to OpenAI API...');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 200,
        temperature: 0.2,
      }),
    });

    console.log('OpenAI API response status:', res.status);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.error('OpenAI API Error Response:', data);
      const errorMessage = data.error?.message || 'OpenAI API error after request';
      return NextResponse.json({ error: errorMessage, details: data.error }, { status: res.status || 500 });
    }
    
    const aiResponse = data.choices?.[0]?.message?.content || '';
    console.log('Successfully got AI response.');
    return NextResponse.json({ response: aiResponse });

  } catch (error: any) {
    console.error('API Route CATCH Block Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error in catch block' }, { status: 500 });
  }
} 