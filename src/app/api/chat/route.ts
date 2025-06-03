import { NextRequest, NextResponse } from 'next/server';
import { Scenario } from '../../../data/scenarios'; // 시나리오 타입 경로 수정 필요 시 확인

export async function POST(req: NextRequest) {
  try {
    const { prompt, scenario } = await req.json() as { prompt: string, scenario: Scenario };

    if (!prompt || !scenario) {
      return NextResponse.json({ error: 'Missing prompt or scenario' }, { status: 400 });
    }

    const systemMessage = `너는 추리 게임의 마스터야.\n시나리오: ${scenario.title}\n설명: ${scenario.description}\n정답: ${scenario.answer}`;

    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: prompt },
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 200,
        temperature: 0.2,
      }),
    });

    const data = await res.json();

    if (data.error) {
      console.error('OpenAI API Error:', data.error);
      return NextResponse.json({ error: 'OpenAI API error', details: data.error }, { status: 500 });
    }
    
    const aiResponse = data.choices?.[0]?.message?.content || '';
    return NextResponse.json({ response: aiResponse });

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 