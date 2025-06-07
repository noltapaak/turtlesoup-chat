import { NextRequest, NextResponse } from 'next/server';
import { Scenario } from '../../../data/scenarios'; // 시나리오 타입 경로 수정 필요 시 확인
import Groq from 'groq-sdk';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

export const dynamic = 'force-dynamic'; // 항상 동적으로 실행되도록 설정

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  console.log('API Route /api/chat called with Groq');
  try {
    const { prompt, scenario, messages: prevMessages, isGuess } = await req.json() as { prompt: string, scenario: Scenario, messages: {role: 'user' | 'ai', content: string}[], isGuess?: boolean };
    console.log('Received prompt:', prompt);
    console.log('Received scenario ID:', scenario?.id);
    console.log('Is this a guess?', isGuess);


    if (!prompt || !scenario) {
      console.error('Missing prompt or scenario');
      return NextResponse.json({ error: 'Missing prompt or scenario' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY is not set');
      return NextResponse.json({ error: 'Server configuration error: GROQ_API_KEY not set' }, { status: 500 });
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
      systemMessageContent = `당신은 \"${scenario.title}\" 시나리오를 진행하는 AI 추리 게임 마스터입니다. 당신의 역할은 사용자의 질문에 '예', '아니오', 또는 '관련 없음'으로만 대답하여 스무고개처럼 게임을 진행하는 것입니다. **당신의 말투는 딱딱하지 않고, 조금 더 친절하고 자연스러워야 합니다.**

      **정답 정보 (판단 기준):** "${scenario.answer}"

      **게임 규칙:**

      1.  **'예/아니오'로 답할 수 있는 질문:**
          *   **질문이 사실일 때:** "네, 맞습니다."로 시작하고, 사용자의 질문을 확인하는 느낌으로 자연스럽게 답변해주세요. (예: 사용자가 "여자는 트라우마가 있었나요?"라고 물으면, "네, 맞습니다. 여자는 트라우마가 있었습니다." 와 같이 답변) **단, 절대 묻지 않은 추가 정보는 말하지 마세요.**
          *   **질문이 사실이 아닐 때:** "아니요, 그렇지 않습니다." 라고 답변해주세요. (예: "아니요, 그렇지 않습니다. 남자는 직업이 없었습니다.")
          *   **질문이 사건과 관련이 없을 때:** "아니요, 그건 사건과 직접적인 관련이 없습니다." 라고 답변해주세요.

      2.  **'예/아니오'로 답할 수 없는 질문 (언제, 어디서, 누가, 무엇을, 어떻게, 왜 등):**
          *   이런 질문에는 절대 답을 알려주지 마세요. 대신, **"죄송하지만 '예' 또는 '아니오'로 답할 수 있는 질문으로 다시 물어봐 주시겠어요?"** 라고 똑같이 대답하여 질문 수정을 유도해야 합니다.
          *   (예시) 사용자 질문: "남자의 직업은 무엇인가요?" -> **정확한 답변:** "죄송하지만 '예' 또는 '아니오'로 답할 수 있는 질문으로 다시 물어봐 주시겠어요?"

      3.  **너무 광범위하거나 애매한 질문:**
          *   질문이 너무 막연하면 구체적인 질문을 하도록 유도하세요.
          *   (예시) 사용자 질문: "남자는 장애인인가요?" -> **좋은 답변:** "어떤 종류의 장애를 생각하고 계신지 좀 더 구체적으로 질문해주시겠어요?"

      4.  **정답 추측 안내:**
          *   사용자의 메시지가 스무고개 질문이 아니라 사건의 전말을 추리하여 설명하는 것 같다면, "'정답 외치기' 버튼을 사용해서 정답을 맞춰보세요."라고 안내해주세요.

      **매우 중요한 원칙:** 당신은 스무고개 진행자입니다. 질문에 대한 사실 확인 외에, 추리를 유도하거나 힌트를 주는 발언은 절대 하지 마세요.

      **현재까지의 대화 내용:**
      ${(prevMessages || []).map(msg => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`).join('\\n')}
      
      위 가이드라인, 특히 **질문의 의도와 맥락 파악** 및 **모호한 질문에 대한 처리 방식**을 반드시 지켜서 다음 질문에 답변해주세요.`;
    }
    
    // 사용자가 직접 정답을 입력했는지 간단히 확인하는 로직은 AI 판단에 맡기므로 주석 처리 또는 삭제합니다.
    // if (prompt.toLowerCase().includes(scenario.answer.toLowerCase())) {
    //     console.log('User may have guessed the answer directly.');
    // }

    // 대화가 길어질 경우를 대비해, 최근 대화 내용 일부와 현재 프롬프트만 전송
    const recentMessages = (prevMessages || []).slice(-4); // 최근 4개의 메시지만 포함 (조절 가능)

    const messagesToGroq: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessageContent },
      ...recentMessages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user' as 'assistant' | 'user',
        content: msg.content
      })),
      { role: 'user', content: prompt },
    ];

    const chatCompletion = await groq.chat.completions.create({
        messages: messagesToGroq,
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 500,
    });
    
    const aiResponse = chatCompletion.choices[0]?.message?.content || '';
    
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