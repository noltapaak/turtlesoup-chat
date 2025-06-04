import { NextRequest, NextResponse } from 'next/server';
import { Scenario } from '../../../data/scenarios'; // 시나리오 타입 경로 수정 필요 시 확인

export const dynamic = 'force-dynamic'; // 항상 동적으로 실행되도록 설정

export async function POST(req: NextRequest) {
  console.log('API Route /api/chat called'); // 함수 호출 로그
  try {
    // 이전 messages 배열을 요청 바디에서 받도록 수정 (클라이언트에서 전달 필요)
    const { prompt, scenario, messages: prevMessages } = await req.json() as { prompt: string, scenario: Scenario, messages: {role: 'user' | 'ai', content: string}[] };
    console.log('Received prompt:', prompt);
    console.log('Received scenario ID:', scenario?.id);
    console.log('Received previous messages:', prevMessages);


    if (!prompt || !scenario) {
      console.error('Missing prompt or scenario');
      return NextResponse.json({ error: 'Missing prompt or scenario' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'Server configuration error: API key not set' }, { status: 500 });
    }

    // 개선된 시스템 프롬프트 (src/lib/openai.ts에서 가져온 내용 기반)
    // messages 변수명을 prevMessages로 변경했으므로, join하는 부분도 수정합니다.
    const systemMessageContent = `당신은 \"${scenario.title}\" 시나리오를 진행하는 친절하고 능숙한 AI 추리 게임 마스터입니다. 당신의 역할은 사용자가 즐겁게 게임에 몰입하도록 돕는 것입니다.

**매우 중요한 기본 원칙: 당신의 모든 답변은 최소 2문장 이상이어야 하며, 절대로 한 문장짜리 단답 (예: "예.", "아니오.")으로 끝나서는 안 됩니다.**

**게임 답변 규칙:**
사용자의 질문에 대해 다음 세 가지 중 하나의 형태로 답변해야 합니다. 각 답변은 명시된 기본 문구로 시작하고, **반드시** 그 뒤에 사용자의 추리를 돕거나, 감정을 표현하거나, 다음 질문을 유도하는 문장을 덧붙여야 합니다.

1.  **긍정 답변:** \"예, 맞습니다.\"로 시작하고, 이어서 질문에 대한 추가 정보, 칭찬, 또는 다음 추리를 위한 가이드 등을 최소 한 문장 이상 추가합니다.
    *   *나쁜 예시 (절대 금지)*: \"예.\"
    *   *좋은 예시*: \"예, 맞습니다! 아주 중요한 포인트를 짚으셨네요. 혹시 그게 왜 중요하다고 생각하시나요?\"
    *   *좋은 예시*: \"예, 맞습니다. 그 사실이 사건 해결에 어떤 영향을 미칠까요?\"

2.  **부정 답변:** \"아니요, 그렇지 않습니다.\"로 시작하고, 이어서 다른 가능성을 제시하거나, 사용자를 격려하거나, 관련된 다른 질문을 유도하는 문장을 최소 한 문장 이상 추가합니다.
    *   *나쁜 예시 (절대 금지)*: \"아니오.\"
    *   *좋은 예시*: \"아니요, 그렇지 않습니다. 하지만 거의 근접했어요! 다른 방향으로 생각해 보시는 건 어때요?\"
    *   *좋은 예시*: \"아니요, 그렇지 않습니다. 그 부분은 함정일 수도 있어요. 다른 단서에 집중해볼까요?\"

3.  **무관 답변:** \"그 질문은 정답과 직접적인 관련은 없습니다.\"로 시작하고, 이어서 사용자의 생각을 다른 곳으로 유도하거나, 현재 추리에서 벗어나지 않도록 부드럽게 안내하는 문장을 최소 한 문장 이상 추가합니다.
    *   *나쁜 예시 (절대 금지)*: \"관련 없습니다.\"
    *   *좋은 예시*: \"그 질문은 정답과 직접적인 관련은 없습니다. 하지만 재미있는 상상력이시네요! 사건의 핵심 단서에 조금 더 집중해보면 어떨까요?\"
    *   *좋은 예시*: \"그 질문은 정답과 직접적인 관련은 없습니다. 현재까지 나온 단서들을 다시 한번 살펴볼까요?\"

**추가 응답 스타일 가이드:**
*   **적극적인 공감 및 격려**: 사용자의 추리에 대해 \"좋은 질문입니다!\", \"흥미로운 접근이네요!\" 와 같이 긍정적으로 반응하고, 막히면 \"괜찮아요, 이 문제는 원래 좀 어렵습니다. 다른 힌트를 사용해 보시겠어요?\" 등으로 대화를 이끌어주세요.
*   **자연스러운 대화체 사용**: 친구와 대화하듯 친근하게 말해주세요.
*   **정답 확인**: 사용자가 정답을 맞혔다고 판단되면, \"정답입니다! 훌륭해요! ${scenario.explanation || scenario.answer}\"처럼 명확하게 알리고 해설을 제공해주세요.

**현재까지의 대화 내용:**
${(prevMessages || []).map(msg => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`).join('\\n')}

위 가이드라인, 특히 **모든 답변은 최소 2문장 이상**이라는 점과 **명시된 형태로 답변을 시작하고 반드시 부연 설명을 추가**해야 한다는 점을 반드시 지켜서 다음 질문에 답변해주세요.`;
    
    // 사용자가 직접 정답을 입력했는지 간단히 확인하는 로직은 그대로 두거나, 시스템 프롬프트의 정답 확인 로직과 통합 고려
    if (prompt.toLowerCase().includes(scenario.answer.toLowerCase())) {
        console.log('User may have guessed the answer directly.');
        // 시스템 프롬프트에 정답 확인 로직이 있으므로, AI가 판단하도록 넘길 수 있음
        // 또는 여기서 명확히 "정답입니다!" 처리 후 해설만 반환할 수도 있음
        // 여기서는 일단 AI의 판단에 맡기도록 시스템 프롬프트로 전달
    }

    const messagesToOpenAI = [
      { role: 'system', content: systemMessageContent },
      // 이전 대화 내용을 시스템 프롬프트에 포함시켰으므로, 여기서는 현재 사용자 프롬프트만 전달
      // 필요하다면, 이전 대화 내용을 여기에 다시 포함시킬 수도 있지만, 시스템 프롬프트 내의 대화 내용과 중복될 수 있음
      ...(prevMessages || []).map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : msg.role as 'user',
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
      // API 에러 메시지를 그대로 반환하거나, 더 사용자 친화적인 메시지로 가공
      const errorMessage = data.error?.message || 'OpenAI API 요청 중 알 수 없는 오류가 발생했습니다.';
      // 실제 사용자에게 OpenAI의 상세 에러 메시지를 그대로 노출하는 것은 좋지 않을 수 있습니다.
      // return NextResponse.json({ error: errorMessage, details: data.error }, { status: res.status || 500 });
      return NextResponse.json({ error: "AI 응답 생성 중 문제가 발생했습니다. 다시 시도해주세요." }, { status: res.status || 500 });
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
    // 사용자에게 노출되는 에러 메시지
    return NextResponse.json({ error: "요청 처리 중 서버에서 오류가 발생했습니다." }, { status: 500 });
  }
} 