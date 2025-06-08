import { NextRequest, NextResponse } from 'next/server';
import { Scenario } from '../../../data/scenarios'; // 시나리오 타입 경로 수정 필요 시 확인
import Groq from 'groq-sdk';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

export const dynamic = 'force-dynamic'; // 항상 동적으로 실행되도록 설정

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Helper Functions - START

/**
 * 질문이 주관식인지 판별합니다.
 * @param prompt 사용자 입력
 */
function isSubjectiveQuestion(prompt: string): boolean {
  const keywords = ['누가', '언제', '어디', '무엇을', '무엇', '뭘', '어떻게', '왜', '어떤', '어느', '무슨', '얼마나', '몇'];
  const regex = new RegExp(keywords.join('|'));
  return regex.test(prompt);
}

/**
 * 질문이 불완전한 단어/명사 형태인지 판별합니다.
 * @param prompt 사용자 입력
 */
function isVagueNounInput(prompt: string): boolean {
  const p = prompt.trim();
  if (p.includes(' ')) return false; // 공백이 있으면 구/절로 간주
  if (p.length <= 1) return true; // 한 글자는 불완전

  const questionEndings = ['나요', '가요', '인가요', '습니까', 'ㅂ니까', '했나요', '었나요', '였나요', '죠', '까요'];
  return !questionEndings.some(ending => p.endsWith(ending + '?'));
}

/**
 * 질문에 주어가 없는지 판별합니다.
 * @param prompt 사용자 입력
 */
function isMissingSubject(prompt: string): boolean {
    const p = prompt.trim();
    // 시나리오의 핵심 인물/사물 키워드 (확장 가능)
    const subjects = ['남자', '여자', '아이', '그', '그녀', '범인', '조종사', '사람', '인물', '물건'];
    if (subjects.some(s => p.startsWith(s))) {
        return false;
    }
    // 동사/형용사로 시작하는 짧은 질문을 주어 없는 것으로 간주
    const verbEndings = ['나요?', '가요?', '었나요?', '였나요?'];
    if (p.split(' ').length <= 2 && verbEndings.some(e => p.endsWith(e))) {
        return true;
    }
    return false;
}

/**
 * 사용자의 입력이 정답을 말하려는 서술형 문장인지 판별합니다.
 * @param prompt 사용자 입력
 */
function isDeclarativeStatement(prompt: string): boolean {
    const p = prompt.trim();
    // 물음표로 끝나면 질문으로 간주합니다.
    if (p.endsWith('?')) {
        return false;
    }
    // 명확한 질문형 어미가 아닌, 서술/평서형 어미로 끝나는 경우 정답 시도로 판단합니다.
    // "죽었어"와 같은 구어체도 포함합니다.
    const declarativeEndings = ['다', '다.', '어', '어.', '죠', '죠.', '음', '음.'];
    return declarativeEndings.some(e => p.endsWith(e));
}

// Helper Functions - END

export async function POST(req: NextRequest) {
  console.log('API Route /api/chat called with Groq');
  try {
    const { prompt: rawPrompt, scenario, messages: prevMessages, isGuess } = await req.json() as { prompt: string, scenario: Scenario, messages: {role: 'user' | 'ai', content: string}[], isGuess?: boolean };
    const prompt = rawPrompt.trim();
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

    // --- [파이프라인] 일반 질문 처리 로직 ---

    // 1. 불완전한 질문 처리
    if (isVagueNounInput(prompt)) {
        return NextResponse.json({ response: "질문이 조금 더 구체적이면 좋을 것 같아요. 예: '밥을 먹었나요?'처럼 완전한 문장으로 물어봐 주세요." });
    }
    if (isMissingSubject(prompt)) {
        return NextResponse.json({ response: "누구에 대한 질문인지 명확하지 않아요. 예: '남자가 죽었나요?'처럼 질문해주세요." });
    }

    // 2. 질문 의도 분석
    if (isSubjectiveQuestion(prompt)) {
        return NextResponse.json({ response: "죄송하지만 '예' 또는 '아니오'로 답할 수 있는 질문으로 다시 물어봐 주세요." });
    }
     if (isDeclarativeStatement(prompt)) {
        return NextResponse.json({ response: "혹시 정답을 말씀하시려는 건가요? '정답 외치기' 버튼을 사용해 주세요!" });
    }

    // 3. AI를 이용한 '판정'
    const systemMessageContent = `당신은 추리 게임의 심판입니다. 당신의 유일한 목표는 플레이어의 질문이 비밀 정답과 일치하는지 판정하는 것입니다.

**비밀 정답:** "${scenario.answer}"

**플레이어의 질문:** "${prompt}"

플레이어의 질문을 다음 세 가지 중 하나로 분류하세요:
1.  **YES**: 질문 내용이 '비밀 정답'에 비추어 보았을 때 **사실과 일치하거나, 의미적으로 연관성이 매우 높은 경우**.
2.  **NO**: 질문 내용이 '비밀 정답'과 **명백히 다르거나, 사실이 아닌 경우**.
3.  **IRRELEVANT**: 질문 내용이 '비밀 정답'과 **직접적인 관련이 없는 경우**.

**오직 단 한 단어로만 대답하세요: YES, NO, 또는 IRRELEVANT.** 어떤 설명이나 문장 부호도 추가하지 마세요.`;
    
    const messagesToGroq: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessageContent },
      // AI가 현재 질문에만 집중하도록 이전 대화 내용은 포함하지 않습니다.
      { role: 'user', content: prompt },
    ];

    const chatCompletion = await groq.chat.completions.create({
        messages: messagesToGroq,
        model: 'llama3-8b-8192',
        temperature: 0, 
        max_tokens: 10,
    });
    
    const aiResponse = chatCompletion.choices[0]?.message?.content?.trim().toUpperCase() || 'ERROR';
    
    // 4. 응답 검증 및 최종 조립
    let finalResponse = '';
    switch (aiResponse) {
      case 'YES':
        const questionBody = prompt.endsWith('?') ? prompt.slice(0, -1) : prompt;
        if (questionBody.endsWith('나요')) {
          finalResponse = `네, 맞습니다. ${questionBody.slice(0, -2)}습니다.`;
        } else if (questionBody.endsWith('가요')) {
          finalResponse = `네, 맞습니다. ${questionBody.slice(0, -2)}니다.`;
        } else if (questionBody.endsWith('인가요')) {
          finalResponse = `네, 맞습니다. ${questionBody.slice(0, -3)}입니다.`;
        } else {
          finalResponse = '네, 맞습니다.';
        }
        break;
      case 'NO':
        finalResponse = '아니요, 그렇지 않습니다.';
        break;
      case 'IRRELEVANT':
        finalResponse = '그것은 사건과 직접적인 관련이 없습니다.';
        break;
      default: // AI가 이상한 답변을 했을 경우
        finalResponse = "답변을 정확히 이해하지 못했어요. 다시 질문해 주시겠어요?";
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