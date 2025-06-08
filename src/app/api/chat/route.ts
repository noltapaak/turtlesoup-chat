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
  // '예', '아니오'로 답할 수 없는 질문의 키워드 목록을 대폭 강화합니다.
  const subjectiveKeywords = ['누가', '언제', '어디', '무엇을', '무엇', '뭘', '어떻게', '왜', '어떤', '어느', '무슨', '얼마나', '몇'];
  const regex = new RegExp(subjectiveKeywords.join('|'));
  return regex.test(prompt);
}

/**
 * 사용자의 입력이 질문 형태가 아닌 단일 명사인지 판별합니다.
 * @param prompt 사용자 입력
 * @returns 단일 명사 형태이면 true, 그렇지 않으면 false
 */
function isVagueNounInput(prompt: string): boolean {
    const p = prompt.trim();
    // 문장에 공백이 포함되어 있으면 구나 절로 판단하여, 단일 명사가 아니라고 간주합니다.
    if (p.includes(' ')) {
        return false;
    }

    // 한 글자 입력은 대부분 의도가 불분명하므로 모호한 입력으로 처리합니다.
    if (p.length === 1) {
        return true;
    }

    // 입력이 전형적인 한국어 질문 어미로 끝나는지 확인합니다.
    const questionEndings = ['나요?', '가요?', '인가요?', '습니까?', 'ㅂ니까?', '했나요?', '었나요?', '였나요?', '죠?', '까요?'];
    for (const ending of questionEndings) {
        if (p.endsWith(ending)) {
            return false; // 예: "교통사고인가요?"
        }
    }

    // 공백이 없으면서, 명확한 질문 어미로 끝나지 않는 경우 단일 명사로 판단합니다.
    return true;
}

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

    // '정답 외치기'와 '일반 질문' 로직을 완전히 분리하여 처리합니다.
    if (isGuess) {
      // 정답 추측 시 시스템 프롬프트
      const systemMessageContent = `당신은 추리 게임의 정답 판정 AI입니다. 사용자가 정답을 추측했습니다. 주어진 정답과 사용자의 입력을 비교하여 판정해주세요.

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
      
      const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemMessageContent },
            ...(prevMessages || []).slice(-4).map(msg => ({
              role: msg.role === 'ai' ? 'assistant' : 'user' as 'assistant' | 'user',
              content: msg.content
            })),
            { role: 'user', content: prompt },
          ],
          model: 'llama3-8b-8192',
          temperature: 0.7,
          max_tokens: 200, // 정답 설명을 위해 토큰을 넉넉하게 설정
      });

      const finalResponse = chatCompletion.choices[0]?.message?.content || "오류가 발생했습니다. 다시 시도해주세요.";
      console.log(`AI raw response (guess): ${finalResponse}`);
      return NextResponse.json({ response: finalResponse });
    }

    // --- 일반 질문 처리 로직 ---

    // 단계 0: 단일 명사 또는 불분명한 짧은 입력 필터링
    if (isVagueNounInput(prompt)) {
      console.log('Vague noun input detected, responding without calling AI.');
      const cleanPrompt = prompt.replace(/[?]/g, '');
      return NextResponse.json({ response: `'${cleanPrompt}'에 대해 질문하시려면, 완전한 문장으로 다시 물어봐 주시겠어요? (예: '${cleanPrompt}'이/가 사건과 관련이 있나요?)` });
    }

    // 1단계: 서버에서 주관식 질문 사전 필터링
    if (isSubjectiveQuestion(prompt)) {
      console.log('Subjective question detected, responding without calling AI.');
      return NextResponse.json({ response: "죄송하지만 '예' 또는 '아니오'로 답할 수 있는 질문으로 다시 물어봐 주시겠어요?" });
    }
    
    // 2단계: AI의 역할을 '판정'으로 제한하는 시스템 프롬프트
    const systemMessageContent = `You are a fact-checking AI.
    The TRUTH is: "${scenario.answer}".
    
    Analyze the user's question: "${prompt}"
    
    Based on the TRUTH, is the user's question True, False, or Irrelevant?
    - If the question is true according to the TRUTH, respond with ONLY the single word: YES
    - If the question is false according to the TRUTH, respond with ONLY the single word: NO
    - If the question is not related to the TRUTH, respond with ONLY the single word: IRRELEVANT
    
    Your entire response MUST be a single word. Do not add any explanation or punctuation.`;
    
    const messagesToGroq: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessageContent },
      { role: 'user', content: prompt },
    ];

    const chatCompletion = await groq.chat.completions.create({
        messages: messagesToGroq,
        model: 'llama3-8b-8192',
        temperature: 0, 
        max_tokens: 10,
    });
    
    const aiResponse = chatCompletion.choices[0]?.message?.content?.trim().toUpperCase() || '';
    
    // 3단계: AI의 판정을 기반으로 서버에서 최종 답변 생성 (고도화된 버전)
    let finalResponse = '';
    switch (aiResponse) {
      case 'YES':
        const questionBody = prompt.endsWith('?') ? prompt.slice(0, -1) : prompt;
        if (questionBody.endsWith('나요')) { // ex: ~했나요?, ~있나요?
          finalResponse = `네, 맞습니다. ${questionBody.slice(0, -2)}습니다.`;
        } else if (questionBody.endsWith('가요')) { // ex: ~가요?
          finalResponse = `네, 맞습니다. ${questionBody.slice(0, -2)}니다.`;
        } else if (questionBody.endsWith('인가요')) { // ex: ~인가요?
          finalResponse = `네, 맞습니다. ${questionBody.slice(0, -3)}입니다.`;
        } else {
          finalResponse = '네, 맞습니다.'; // 그 외의 경우는 가장 안전한 답변으로 처리
        }
        break;
      case 'NO':
        finalResponse = '아니요, 그렇지 않습니다.';
        break;
      case 'IRRELEVANT':
        finalResponse = '그것은 사건과 직접적인 관련이 없습니다.';
        break;
      default:
        console.warn("Unexpected AI response, defaulting to 'irrelevant'. Response:", aiResponse);
        finalResponse = '그것은 사건과 직접적인 관련이 없습니다.';
        break;
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