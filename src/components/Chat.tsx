'use client';

import { useState } from 'react';
import { Scenario } from '@/data/scenarios';
import { Button } from '@/components/ui/button';
import CorrectAnswerModal from './CorrectAnswerModal';

type Message = {
  role: 'user' | 'ai';
  content: string;
};

export default function Chat({ scenario }: { scenario: Scenario }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<{ answer: string; explanation: string } | null>(null);

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: `[정답 시도] ${input}` }];
    setMessages(newMessages);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentInput, scenario, isGuess: true }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '서버에서 오류가 발생했습니다.');
      }

      const data = await res.json();
      const { isCorrect, answer, explanation, hint } = data.response;

      if (isCorrect) {
        setCorrectAnswer({ answer, explanation });
        setIsModalOpen(true);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: hint }]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setMessages(prev => [...prev, { role: 'ai', content: `오류: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map((message, index) => (
          <div key={index} className={`p-2 ${message.role === 'user' ? 'bg-gray-100' : 'bg-gray-200'}`}>
            {message.content}
          </div>
        ))}
      </div>
      <div className="flex-0">
        <form onSubmit={handleGuess}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="정답을 입력하세요"
            className="w-full p-2 border rounded-md"
          />
          <Button type="submit" className="whitespace-nowrap" disabled={isLoading}>
            전송
          </Button>
        </form>
      </div>
      <CorrectAnswerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        answer={correctAnswer?.answer || ''}
        explanation={correctAnswer?.explanation || ''}
      />
    </div>
  );
} 