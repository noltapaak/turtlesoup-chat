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
    usedHintsMap, // Zustand 스토어에서 가져옴
    setScenario,
    addMessage,
    setFinished,
    updateHintsUsed, // 이름 변경된 액션 사용
    loadInitialHints, // Zustand 스토어 액션
  } = useScenarioStore();
  const [loading, setLoading] = useState(false);
  const [recordSaved, setRecordSaved] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false); // 정답 추측 모달 상태
  const [guessValue, setGuessValue] = useState(''); // 정답 추측 입력값 상태

  const currentUsedHints = scenario ? usedHintsMap[scenario.id] || 0 : 0;

  // 시나리오 선택 안 했으면 /scenarios로 이동
  useEffect(() => {
    if (!scenarioId) {
      router.replace('/scenarios');
      return;
    }
    const found = scenarios.find(s => s.id === scenarioId);
    if (found && (!scenario || scenario.id !== found.id)) {
      setScenario(found);
      // 로컬 스토리지에서 해당 시나리오의 힌트 사용 횟수 불러오기
      const storedHintsCount = parseInt(localStorage.getItem(`hints_${found.id}`) || '0', 10);
      loadInitialHints(found.id, storedHintsCount);

      useScenarioStore.setState({ messages: [], questionCount: 0, finished: false });
      setRecordSaved(false);
      setShowRestartModal(false);
      
      addMessage({ role: 'ai', content: `시나리오: ${found.title}\n\n${found.description}` });
      
      const rulesParts = found.rules.split('\n\n예시 질문:');
      const mainRules = rulesParts[0];
      const exampleQuestions = rulesParts[1] ? `예시 질문:\n${rulesParts[1]}` : undefined;

      addMessage({ role: 'ai', content: `규칙:\n${mainRules}` });
      if (exampleQuestions) {
        addMessage({ role: 'ai', content: exampleQuestions });
      }
    }
  }, [scenarioId, router, scenario, setScenario, addMessage, loadInitialHints]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (finished && !recordSaved && scenario) {
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
    const currentMessages = useScenarioStore.getState().messages; // API 호출 직전의 최신 메시지 가져오기
    addMessage({ role: 'user', content: value });
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // 이전 메시지(currentMessages)와 현재 프롬프트(value), 시나리오를 함께 전달
        body: JSON.stringify({ prompt: value, scenario, messages: currentMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API 요청 실패');
      }

      const data = await response.json();
      const aiMsg = data.response;

      addMessage({ role: 'ai', content: aiMsg });
      
      if (aiMsg.startsWith('정답입니다')) { 
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

  const handleGuessSubmit = async (guess: string) => {
    if (!scenario || !guess.trim()) return;
    setShowAnswerModal(false);
    addMessage({ role: 'user', content: `[정답 시도] ${guess}` });
    setLoading(true);

    const currentMessages = useScenarioStore.getState().messages;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: guess, 
          scenario, 
          messages: currentMessages, 
          isGuess: true // 정답 추측임을 명시
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API 요청 실패');
      }

      const data = await response.json();
      const aiMsg = data.response;

      addMessage({ role: 'ai', content: aiMsg });

      if (aiMsg.startsWith('정답입니다')) {
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
    setGuessValue(''); // 입력값 초기화
  };

  const handleRestart = () => {
    if (scenario) {
      const initialMessages: { role: 'ai' | 'user'; content: string }[] = [];
      initialMessages.push({ role: 'ai', content: `시나리오: ${scenario.title}\n\n${scenario.description}` });
      
      const rulesParts = scenario.rules.split('\n\n예시 질문:');
      const mainRules = rulesParts[0];
      const exampleQuestions = rulesParts[1] ? `예시 질문:\n${rulesParts[1]}` : undefined;

      initialMessages.push({ role: 'ai', content: `규칙:\n${mainRules}` });
      if (exampleQuestions) {
        initialMessages.push({ role: 'ai', content: exampleQuestions });
      }

      useScenarioStore.setState({
        messages: initialMessages,
        questionCount: 0,
        finished: false, 
      });
      localStorage.setItem(`hints_${scenario.id}`, '0'); // 로컬 스토리지 힌트 횟수 초기화
      loadInitialHints(scenario.id, 0); // Zustand 스토어 힌트 횟수 초기화
      setRecordSaved(false); 
      setShowRestartModal(false); 
    }
  };

  const handleGoHome = () => {
    router.push('/scenarios');
  };

  const handleHint = () => {
    if (!scenario || !scenario.hints || scenario.hints.length === 0) {
      addMessage({ role: 'ai', content: '이 시나리오에는 사용할 수 있는 힌트가 없습니다.' });
      return;
    }
    if (currentUsedHints >= scenario.hints.length) {
      addMessage({ role: 'ai', content: '모든 힌트를 사용했습니다.' });
      return;
    }

    const hintToShow = scenario.hints[currentUsedHints];
    addMessage({ role: 'ai', content: `힌트: ${hintToShow}` });
    updateHintsUsed(scenario.id); // 이름 변경된 액션 호출
    localStorage.setItem(`hints_${scenario.id}`, (currentUsedHints + 1).toString()); // 로컬 스토리지 업데이트
  };

  if (!scenario) {
    return <div className="flex h-screen items-center justify-center">Loading scenario...</div>;
  }

  const totalHints = scenario.hints ? scenario.hints.length : 0;
  const canUseHint = scenario.hints && scenario.hints.length > 0 && currentUsedHints < scenario.hints.length;

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
      <div className="p-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex gap-2 mb-2">
          {scenario.hints && scenario.hints.length > 0 && (
            <button
              onClick={handleHint}
              disabled={!canUseHint || loading || finished}
              className="flex-1 px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900"
            >
              힌트 보기 ({currentUsedHints}/{totalHints})
            </button>
          )}
          <button
            onClick={() => setShowAnswerModal(true)}
            disabled={loading || finished}
            className="flex-1 px-4 py-2 border border-green-500 text-green-500 rounded hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900"
          >
            정답 외치기
          </button>
        </div>
        <ChatInput onSend={handleSend} disabled={loading || finished} />
      </div>
      {showAnswerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">정답을 입력하세요</h2>
            <textarea
              value={guessValue}
              onChange={(e) => setGuessValue(e.target.value)}
              placeholder="여기에 정답을 입력해주세요..."
              className="w-full p-2 border rounded mb-4 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              rows={4}
            />
            <div className="flex justify-end gap-4">
              <button 
                onClick={() => setShowAnswerModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
              >
                취소
              </button>
              <button 
                onClick={() => handleGuessSubmit(guessValue)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}
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