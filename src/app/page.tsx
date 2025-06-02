"use client";
import React, { useRef, useEffect, useState } from 'react';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import { useScenarioStore } from '../store/useScenarioStore';
import { scenarios } from '../data/scenarios';
import { useSearchParams, useRouter } from 'next/navigation';
import { callGptWithScenario } from '../utils/gpt';
import { savePlayRecord } from '../utils/record';
import { getUserId } from '../utils/user';

export default function Home() {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const scenarioId = searchParams.get('scenario');

  const {
    scenario,
    messages,
    questionCount,
    finished,
    setScenario,
    addMessage,
    setFinished,
    reset,
  } = useScenarioStore();
  const [loading, setLoading] = useState(false);
  const [recordSaved, setRecordSaved] = useState(false);

  // 시나리오 선택 안 했으면 /scenarios로 이동
  useEffect(() => {
    if (!scenarioId) {
      router.replace('/scenarios');
      return;
    }
    const found = scenarios.find(s => s.id === scenarioId);
    if (found && (!scenario || scenario.id !== found.id)) {
      setScenario(found);
    }
  }, [scenarioId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (finished && !recordSaved && scenario) {
      // 게임 완료 시 기록 저장
      savePlayRecord({
        userId: getUserId(),
        scenarioId: scenario.id,
        messages,
        questionCount,
        finished,
        timestamp: Date.now(),
      });
      setRecordSaved(true);
    }
  }, [finished, recordSaved, scenario, messages, questionCount]);

  const handleSend = async (value: string) => {
    if (!scenario) return;
    addMessage({ role: 'user', content: value });
    setLoading(true);
    try {
      const aiMsg = await callGptWithScenario(value, scenario);
      addMessage({ role: 'ai', content: aiMsg });
      // 정답 맞추기 성공 시 완료 처리(예시)
      if (aiMsg.includes('정답입니다')) setFinished(true);
    } catch (e) {
      addMessage({ role: 'ai', content: 'AI 응답 오류가 발생했습니다.' });
    }
    setLoading(false);
  };

  if (!scenario) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 bg-white shadow flex items-center justify-between">
        <h1 className="text-lg font-bold">🐢 TurtleSoup.chat</h1>
        <div className="text-sm">질문 수: <span className="font-semibold">{questionCount}</span></div>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 text-gray-700 text-base font-semibold">{scenario.title}</div>
        {messages.map((msg: { role: 'user' | 'ai'; content: string }, idx: number) => (
          <ChatMessage key={idx} message={msg.content} role={msg.role} />
        ))}
        {loading && <ChatMessage message="AI가 답변 중..." role="ai" />}
        {finished && <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">🎉 게임이 완료되었습니다!</div>}
        <div ref={chatEndRef} />
      </main>
      <ChatInput onSend={handleSend} disabled={loading || finished} />
    </div>
  );
} 