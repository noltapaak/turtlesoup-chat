import OpenAI from 'openai';
import { Scenario } from '../data/scenarios'; // 경로 수정

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateGptResponse(prompt: string, scenario: Scenario, messages: {role: 'user' | 'ai', content: string}[]) {
  const systemMessage = `당신은 "${scenario.title}" 시나리오를 진행하는 AI 추리 게임 마스터입니다. 사용자는 스무고개 형식으로 질문하며, 당신은 "예", "아니오", 또는 "정답과 직접적인 관련은 없습니다." 세 가지 중 하나로 답변해야 합니다. 사용자가 정답에 가까워지면 힌트를 줄 수 있습니다. 사용자의 추리에 대해 긍정적인 반응(예: "좋은 추리네요!", "흥미로운 질문입니다!")을 보여주거나 다음 질문을 독려하는 문장을 사용해주세요. 단답형 응답(예: "네", "아니오")은 최대한 피하고, 감정을 담아 좀 더 자연스럽게 대화하듯이 답변해주세요. 예를 들어, 사용자가 결정적인 단서를 맞췄을 때는 "정답입니다! 바로 그거예요!" 와 같이 기쁨을 표현할 수 있습니다. 하지만 과도하게 감정적이거나 부자연스러워서는 안 됩니다. 사용자의 첫 질문 이후, 당신의 답변 마지막에는 사용자의 다음 질문을 유도하기 위해 "혹시 다른 부분도 의심되시나요?" 또는 "이런 방향으로도 생각해 보셨나요?" 같은 질문을 자연스럽게 추가해주세요. 이 유도 질문은 매 답변마다 반복할 필요는 없고, 대화의 흐름이 끊기지 않도록 적절한 상황에만 사용해주세요. 현재까지의 대화 내용은 다음과 같습니다:

${messages.map(msg => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`).join('\n')}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      max_tokens: 150,
    });
    // response.choices[0].message.content가 null이 아님을 보장 (OpenAI API 스펙)
    return response.choices[0].message.content!;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error('OpenAI API 요청 중 오류가 발생했습니다.');
  }
} 