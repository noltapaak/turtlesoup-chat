import { NextRequest, NextResponse } from 'next/server';
import { Scenario } from '../../../data/scenarios'; // 시나리오 타입 경로 수정 필요 시 확인

export const dynamic = 'force-dynamic'; // 항상 동적으로 실행되도록 설정

export async function POST(req: NextRequest) {
  console.log('API Route /api/chat called'); // 함수 호출 로그
  try {
    const { prompt, scenario, messages: prevMessages, isGuess } = await req.json() as { prompt: string, scenario: Scenario, messages: {role: 'user' | 'ai', content: string}[], isGuess?: boolean };
    console.log('Received prompt:', prompt);
    console.log('Received scenario ID:', scenario?.id);
    console.log('Is this a guess?', isGuess);


    if (!prompt || !scenario) {
      console.error('Missing prompt or scenario');
      return NextResponse.json({ error: 'Missing prompt or scenario' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'Server configuration error: API key not set' }, { status: 500 });
    }

    let systemMessageContent = '';

    if (isGuess) {
      // 정답 추측 시 시스템 프롬프트
      systemMessageContent = `당신은 추리 게임의 정답 판정 AI입니다. 사용자가 정답을 추측했습니다. 주어진 정답과 사용자의 입력을 비교하여 판정해주세요.

      - **정답:** "${scenario.answer}"
      - **정답 설명:** "${scenario.explanation || '자세한 해설이 없습니다.'}"
      
      **판정 규칙:**
      1. 사용자의 추측이 핵심 요소를 포함하여 **정답과 일치**하면, **반드시 "정답입니다."로 답변을 시작**하고, 이어서 정답 설명을 덧붙여주세요. (예: "정답입니다. ${scenario.explanation}")
      2. 사용자의 추측이 **정답과 다르다면**, **절대 정답을 노출하지 마세요.** 대신, 다음 힌트 중 가장 적절한 하나만 골라 간결하게 답변해주세요.
         - "인물의 행동에 대한 이유가 조금 더 명확해야 합니다."
         - "사건이 발생한 장소나 상황이 더 구체적이어야 합니다."
         - "사건의 핵심 인물이나 대상이 명확하지 않습니다."
         - "사건의 중요한 과정 일부가 빠져있습니다."
         - "추측하신 내용과 실제 사실은 다릅니다."`;
    } else {
      // 일반 질문 시 시스템 프롬프트
      systemMessageContent = `당신은 \"${scenario.title}\" 시나리오를 진행하는 AI 추리 게임 마스터입니다. 당신의 역할은 사용자의 질문에 대해 사실에 기반하여 간결하고 명확하게 답변하는 것입니다.

      **매우 중요한 기본 원칙: 당신의 모든 답변은 50자를 넘지 않아야 하며, 최소 2문장 이상이어야 합니다. 절대로 한 문장짜리 단답 (예: "예.", "아니오.")으로 끝나서는 안 됩니다. 어떠한 경우에도 사용자에게 다음 질문을 제안하거나, 추리를 유도하는 발언을 해서는 안 됩니다.**
      
      **정답 유도 규칙 (새로 추가됨):**
      - 사용자의 질문이 스무고개 질문이 아니라 **사건의 전말을 설명하는 것처럼 보인다면**, "예/아니오"로 답하지 마세요. 대신 **"정답을 추측하시려면 '정답 외치기' 버튼을 사용해주세요."** 라고 정확히 답변하여 버튼 사용을 유도해야 합니다.
      
      **게임 답변 규칙:**
      사용자의 질문에 대해 다음 세 가지 중 하나의 형태로 답변해야 합니다. 각 답변은 명시된 기본 문구로 시작하고, **반드시** 그 뒤에 간결한 사실 확인 또는 감정 표현만을 덧붙여야 합니다. **절대로 다음 행동을 제안하거나, 생각을 유도하거나, 힌트를 암시하는 발언을 하지 마세요. 모든 답변은 50자 이내로 작성해야 합니다.**

      1.  **긍정 답변:** \"예, 맞습니다.\"로 시작하고, 이어서 해당 사실에 대한 아주 간결한 확인 문장만을 추가합니다. (총 50자 이내)
      2.  **부정 답변:** \"아니요, 그렇지 않습니다.\"로 시작하고, 이어서 해당 내용이 사실이 아니라는 간결한 확인 문장만을 추가합니다. (총 50자 이내)
      3.  **무관 답변:** \"그 질문은 현재 사건과 직접적인 관련은 없습니다.\"로 시작하고, 이어서 간결하게 해당 질문이 사건 해결에 도움이 되지 않음을 언급합니다. (총 50자 이내)
      
      **현재까지의 대화 내용:**
      ${(prevMessages || []).map(msg => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`).join('\\n')}
      
      위 가이드라인, 특히 **정답 유도 규칙**과 **답변의 50자 이내 제한**을 반드시 지켜서 다음 질문에 답변해주세요.`;
    }
    
    // 사용자가 직접 정답을 입력했는지 간단히 확인하는 로직은 AI 판단에 맡기므로 주석 처리 또는 삭제합니다.
    // if (prompt.toLowerCase().includes(scenario.answer.toLowerCase())) {
    //     console.log('User may have guessed the answer directly.');
    // }

    // 대화가 길어질 경우를 대비해, 최근 대화 내용 일부와 현재 프롬프트만 전송
    const recentMessages = (prevMessages || []).slice(-4); // 최근 4개의 메시지만 포함 (조절 가능)

    const messagesToOpenAI = [
      { role: 'system', content: systemMessageContent },
      ...recentMessages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : (msg.role as 'user' | 'system'),
        content: msg.content
      })),
      { role: 'user', content: prompt },
    ];

    console.log('Sending request to OpenAI API with messages:', JSON.stringify(messagesToOpenAI, null, 2));
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4', 
        messages: messagesToOpenAI, 
        max_tokens: 200, 
        temperature: 0.7, 
      }),
    });

    console.log('OpenAI API response status:', res.status);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.error('OpenAI API Error Response:', data);
      const errorMessage = data.error?.message || 'OpenAI API 요청 중 알 수 없는 오류가 발생했습니다.';
      return NextResponse.json({ error: `AI 응답 생성 중 문제가 발생했습니다: ${errorMessage}` }, { status: res.status || 500 });
    }
    
    const aiResponse = data.choices?.[0]?.message?.content || '';
    console.log('Raw AI response:', aiResponse);
    
    // AI 응답 후처리 (예: "예."만 있는 경우 방지) - 시스템 프롬프트가 잘 작동하면 필요 없을 수 있음
    // 하지만 안전장치로 간단한 확인 로직 추가 가능
    const shortAnswers = ["예.", "아니요.", "예", "아니오", "관련 없습니다."];
    if (shortAnswers.some(sa => aiResponse.trim() === sa) || !aiResponse.includes(' ')) {
        // AI가 여전히 단답형으로 응답하려고 하면, 프롬프트를 다시 보내거나, 좀 더 일반적인 응답을 강제할 수 있습니다.
        // 여기서는 로그만 남기고 일단 AI 응답을 그대로 전달합니다.
        console.warn("AI response is still very short. System prompt might not be fully effective.", aiResponse);
    }


    console.log('Processed AI response:', aiResponse);
    return NextResponse.json({ response: aiResponse });

  } catch (error: unknown) {
    console.error('API Route CATCH Block Error:', error);
    let errorMessage = 'Internal server error in catch block';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: `요청 처리 중 서버에서 오류가 발생했습니다: ${errorMessage}` }, { status: 500 });
  }
} 