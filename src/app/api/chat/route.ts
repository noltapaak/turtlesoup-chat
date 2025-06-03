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
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'Server configuration error: API key not set' }, { status: 500 });
    }
    // console.log('Using OpenAI API Key (first 5 chars):', apiKey.substring(0, 5)); // 실제 키 일부 로그 (보안상 주의, 테스트 후 제거 권장)

    // 사용자가 직접 정답을 입력했는지 간단히 확인 (더 정교한 로직 필요 가능)
    const isGuessingAnswer = prompt.toLowerCase().includes(scenario.answer.toLowerCase().substring(0, 5)) || 
                             prompt.includes("정답은") || 
                             prompt.includes("답은");
    
    let systemMessageContent = `너는 추리 게임의 마스터이다. 주어진 시나리오에 대해 사용자와 대화한다.
시나리오 제목: ${scenario.title}
시나리오 설명: ${scenario.description}
정답: ${scenario.answer}
해설: ${scenario.explanation || '정답과 동일'}

사용자가 질문을 하면, 그 질문이 정답을 맞히는 데 도움이 되는 내용인지 판단하여 다음 중 하나로만 대답해야 한다:
1. 예
2. 아니오
3. 정답과 직접적인 관련은 없습니다.

절대로 위 세 가지 답변 외의 다른 말이나 힌트를 먼저 주어서는 안 된다. 사용자가 명확하게 "정답은 ..." 또는 "혹시 답은 ..." 과 같이 정답을 직접 말하려고 시도할 때만, 그 추측이 맞는지 판단한다.
만약 사용자의 추측이 정답과 일치하면, "정답입니다! 해설: ${scenario.explanation || scenario.answer}" 라고 정확히 말해야 한다.
만약 사용자의 추측이 틀렸다면, "틀렸습니다." 라고만 말한다.
정답과 관련된 질문이 아닌 일상적인 대화나 농담에는 응답하지 않는다.
`;

    if (isGuessingAnswer && prompt.toLowerCase().includes(scenario.answer.toLowerCase())) {
        console.log('User guessed the answer correctly directly.');
        return NextResponse.json({ response: `정답입니다! 해설: ${scenario.explanation || scenario.answer}` });
    }

    const messages = [
      { role: 'system', content: systemMessageContent },
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
        model: 'gpt-4', // 모델 변경 고려 (gpt-3.5-turbo는 지시를 잘 못 따를 수 있음)
        messages,
        max_tokens: 150, // 답변 길이를 고려하여 조정
        temperature: 0.1, // 답변의 일관성을 위해 낮게 설정
      }),
    });

    console.log('OpenAI API response status:', res.status);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.error('OpenAI API Error Response:', data);
      const errorMessage = data.error?.message || 'OpenAI API error after request';
      return NextResponse.json({ error: errorMessage, details: data.error }, { status: res.status || 500 });
    }
    
    let aiResponse = data.choices?.[0]?.message?.content || '';
    console.log('Raw AI response:', aiResponse);

    // AI 응답이 정답을 포함하는지 다시 한번 확인 (AI가 시스템 프롬프트를 잘 따랐는지)
    if (aiResponse.includes("정답입니다!")) {
        // AI가 이미 해설을 포함했을 수 있으므로, 중복을 피하기 위해 여기서 해설을 강제로 추가하지 않을 수 있음
        // 필요하다면: aiResponse = `정답입니다! 해설: ${scenario.explanation || scenario.answer}`; 
    } else if (!["예", "아니오", "정답과 직접적인 관련은 없습니다."].some(validAnswer => aiResponse.startsWith(validAnswer))) {
        // AI가 지시된 답변 형식 외의 답변을 한 경우, 좀 더 다듬거나 일반적인 메시지로 대체 가능
        // 예: aiResponse = "질문을 이해하지 못했습니다. 예/아니오로 답할 수 있는 질문을 해주시겠어요?";
        // 여기서는 일단 AI 응답을 그대로 전달
    }

    console.log('Processed AI response:', aiResponse);
    return NextResponse.json({ response: aiResponse });

  } catch (error: unknown) {
    console.error('API Route CATCH Block Error:', error);
    let errorMessage = 'Internal server error in catch block';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 