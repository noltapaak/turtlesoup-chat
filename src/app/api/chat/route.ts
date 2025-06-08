import { NextRequest, NextResponse } from 'next/server';
import { Scenario } from '../../../data/scenarios'; // 시나리오 타입 경로 수정 필요 시 확인
import Groq from 'groq-sdk';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

export const dynamic = 'force-dynamic'; // 항상 동적으로 실행되도록 설정

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 주관식 질문을 판별하는 함수
function isSubjectiveQuestion(prompt: string): boolean {
  // '예', '아니오'로 답할 수 없는 질문의 키워드 목록
  const subjectiveKeywords = ['누가', '언제', '어디', '무엇', '어떻게', '왜', '어떤', '무슨', '얼마나', '몇 '];
  const regex = new RegExp(subjectiveKeywords.join('|'));
  return regex.test(prompt);
}

export async function POST(req: NextRequest) {
  console.log('API Route /api/chat called with Groq');
  try {
    const { prompt, scenario, messages: prevMessages, isGuess } = await req.json() as { prompt: string, scenario: Scenario, messages: {role: 'user' | 'ai', content: string}[], isGuess?: boolean };
    console.log('Received prompt:', prompt);
    console.log('Received scenario ID:', scenario?.id);
    console.log('Is this a guess?', isGuess);

    // 1단계: 서버에서 주관식 질문 사전 필터링
    if (!isGuess && isSubjectiveQuestion(prompt)) {
      console.log('Subjective question detected, responding without calling AI.');
      return NextResponse.json({ response: "죄송하지만 '예' 또는 '아니오'로 답할 수 있는 질문으로 다시 물어봐 주시겠어요?" });
    }

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
      // 2단계: AI의 역할을 '판정'으로 제한하는 새로운 시스템 프롬프트
      systemMessageContent = `You are a fact-checking AI.
      The TRUTH is: "${scenario.answer}".
      
      Analyze the user's question: "${prompt}"
      
      Based on the TRUTH, is the user's question True, False, or Irrelevant?
      - If the question is true according to the TRUTH, respond with ONLY the single word: YES
      - If the question is false according to the TRUTH, respond with ONLY the single word: NO
      - If the question is not related to the TRUTH, respond with ONLY the single word: IRRELEVANT
      
      Your entire response MUST be a single word. Do not add any explanation or punctuation.`;
    }
    
    const messagesToGroq: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessageContent },
      // 이전 대화 내용은 AI의 판단을 방해하므로 제거합니다.
      // AI는 오직 '정답'과 '현재 질문'만 보고 판정해야 합니다.
      { role: 'user', content: prompt },
    ];

    const chatCompletion = await groq.chat.completions.create({
        messages: messagesToGroq,
        model: 'llama3-8b-8192',
        temperature: 0, // AI의 답변을 최대한 일관되게 만들기 위해 0으로 설정
        max_tokens: 10, // YES, NO, IRRELEVANT 중 하나만 받으므로 토큰을 최소화
    });
    
    const aiResponse = chatCompletion.choices[0]?.message?.content?.trim().toUpperCase() || '';
    
    // 3단계: AI의 판정을 기반으로 서버에서 최종 답변 생성
    let finalResponse = '';

    if (isGuess) {
      // 정답 추측에 대한 응답은 AI가 생성한 내용을 그대로 사용
      finalResponse = chatCompletion.choices[0]?.message?.content || "오류가 발생했습니다. 다시 시도해주세요.";
    } else {
      // 일반 질문에 대한 응답은 서버에서 직접 조립
      switch (aiResponse) {
        case 'YES':
          // 사용자의 질문을 자연스럽게 활용하여 긍정문 생성
          const positiveEnding = prompt.endsWith('나요?') ? '습니다.' : ' 맞습니다.';
          const questionBody = prompt.replace(/[?가-힣]$/, '').trim();
          finalResponse = `네, 맞습니다. ${questionBody} 맞습니다.`;
          break;
        case 'NO':
          finalResponse = '아니요, 그렇지 않습니다.';
          break;
        case 'IRRELEVANT':
          finalResponse = '그것은 사건과 직접적인 관련이 없습니다.';
          break;
        default:
          // AI가 예상치 못한 답변을 할 경우를 대비한 안전장치
          console.warn("Unexpected AI response, defaulting to 'irrelevant'. Response:", aiResponse);
          finalResponse = '그것은 사건과 직접적인 관련이 없습니다.';
          break;
      }
    }

    console.log(`AI raw response: ${aiResponse}, Final server response: ${finalResponse}`);
    return NextResponse.json({ response: finalResponse });

  } catch (error: unknown) {
    console.error('API Route CATCH Block Error:', error);
    let errorMessage = 'Internal server error in catch block';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: `요청 처리 중 서버에서 오류가 발생했습니다: ${errorMessage}` }, { status: 500 });
  }
} 