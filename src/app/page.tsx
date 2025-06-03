"use client";
import React, { Suspense, useRef, useEffect, useState } from 'react';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import { useScenarioStore } from '../store/useScenarioStore';
import { scenarios } from '../data/scenarios';
import { useSearchParams, useRouter } from 'next/navigation';
// import { callGptWithScenario } from '../utils/gpt'; // 더 이상 사용하지 않음
import { savePlayRecord } from '../utils/record';
import { getUserId } from '../utils/user';

// 내부 컴포넌트로 기존 Home 로직 이동
function ChatPageContent() {
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
  } = useScenarioStore();
  const [loading, setLoading] = useState(false);
  const [recordSaved, setRecordSaved] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  // 시나리오 선택 안 했으면 /scenarios로 이동
  useEffect(() => {
    if (!scenarioId) {
      router.replace('/scenarios');
      return;
    }
    const found = scenarios.find(s => s.id === scenarioId);
    if (found && (!scenario || scenario.id !== found.id)) {
      setScenario(found);
      useScenarioStore.setState({ messages: [], questionCount: 0, finished: false });
      setRecordSaved(false);
      setShowRestartModal(false);
      addMessage({ role: 'ai', content: `시나리오: ${found.title}\n\n${found.description}\n\n규칙: ${found.rules}` });
    }
  }, [scenarioId, router, scenario, setScenario, addMessage]);

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
      setShowRestartModal(true);
    }
  }, [finished, recordSaved, scenario, messages, questionCount]);

  const handleSend = async (value: string) => {
    if (!scenario) return;
    addMessage({ role: 'user', content: value });
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: value, scenario }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API 요청 실패');
      }

      const data = await response.json();
      const aiMsg = data.response;

      addMessage({ role: 'ai', content: aiMsg });
      
      // API 응답에서 "정답입니다!" 와 같은 특정 키워드를 확인하여 finished 상태 변경
      if (aiMsg.includes('정답입니다!')) { 
        setFinished(true);
      }
    } catch (e: unknown) {
      console.error(e);
      let errorMessage = 'AI 응답 오류가 발생했습니다.';
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      addMessage({ role: 'ai', content: errorMessage });
    }
    setLoading(false);
  };

  const handleRestart = () => {
    if (scenario) {
      useScenarioStore.setState({
        messages: [{ role: 'ai', content: `시나리오: ${scenario.title}\n\n${scenario.description}\n\n규칙: ${scenario.rules}` }],
        questionCount: 0,
        finished: false,
      });
      setRecordSaved(false);
      setShowRestartModal(false);
    }
  };

  const handleGoHome = () => {
    router.push('/scenarios');
  };

  if (!scenario) {
    // scenarioId가 없으면 위의 useEffect에서 /scenarios로 리다이렉트됩니다.
    // scenarioId가 있지만 아직 scenario가 설정되지 않은 초기 상태일 수 있습니다.
    return <div className="flex h-screen items-center justify-center">Loading scenario...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-800">
      <header className="p-4 bg-white dark:bg-gray-700 shadow flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">{scenario.title}</h1>
        <div className="text-sm text-gray-600 dark:text-gray-300">질문 수: <span className="font-semibold text-gray-700 dark:text-gray-200">{questionCount}</span></div>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 text-gray-700 dark:text-gray-200 text-base font-semibold">{scenario.title}</div>
        {messages.map((msg: { role: 'user' | 'ai'; content: string }, idx: number) => (
          <ChatMessage key={idx} message={msg.content} role={msg.role} />
        ))}
        {loading && <ChatMessage message="AI가 답변 중..." role="ai" />}
        {finished && 
          <div className="mt-4 p-3 bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-100 rounded">
            🎉 게임이 완료되었습니다!
          </div>
        }
        <div ref={chatEndRef} />
      </main>
      <ChatInput onSend={handleSend} disabled={loading || finished} />
      {showRestartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-xl text-center">
            <h2 className="text-xl font-semibold mb-2 dark:text-gray-100">게임 완료!</h2>
            <p className="mb-1 dark:text-gray-200">총 질문 횟수: {questionCount}</p>
            <p className="mb-6 dark:text-gray-200">이 시나리오를 다시 시작하시겠습니까?</p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={handleRestart}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                재시작
              </button>
              <button 
                onClick={handleGoHome}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
              >
                시나리오 선택으로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-lg text-gray-800 dark:text-gray-100">Loading page...</div>}>
      <ChatPageContent />
    </Suspense>
  );
} 