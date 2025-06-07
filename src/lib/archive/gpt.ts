import { Scenario } from '../data/scenarios';

export async function callGptWithScenario(prompt: string, scenario: Scenario) {
  const system = `너는 추리 게임의 마스터야.\n시나리오: ${scenario.title}\n설명: ${scenario.description}\n정답: ${scenario.answer}`;

  const messages = [
    { role: 'system', content: system },
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
  return data.choices?.[0]?.message?.content || '';
} 