"use client";
import React, { useEffect, useState } from 'react';
import { getRecordById, PlayRecord } from '../../../utils/record';
import { scenarios } from '../../../data/scenarios';
import ChatMessage from '../../../components/ChatMessage';
import { useParams } from 'next/navigation';

export default function RecordReplayPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<PlayRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!id) return;
      const data = await getRecordById(id);
      setRecord(data);
      setLoading(false);
    };
    fetchRecord();
  }, [id]);

  if (loading) return <div className="p-6 text-gray-800 dark:text-gray-100">불러오는 중...</div>;
  if (!record) return <div className="p-6 text-gray-800 dark:text-gray-100">기록을 찾을 수 없습니다.</div>;
  const scenario = scenarios.find(s => s.id === record.scenarioId);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 p-6">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-700 rounded shadow p-4 mb-6 flex flex-col gap-2">
        <div className="font-bold text-lg text-gray-800 dark:text-gray-100">{scenario?.title || '시나리오'}</div>
        <div className="text-gray-700 dark:text-gray-300 text-sm">{scenario?.description}</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">질문 수: <span className="font-semibold text-gray-700 dark:text-gray-200">{record.questionCount}</span></div>
        <div className={`text-sm font-semibold ${record.finished ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{record.finished ? '🎉 성공' : '실패'}</div>
        <button 
          onClick={handleCopy} 
          className="mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-xs w-fit focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          {copied ? '복사됨!' : '공유 링크 복사'}
        </button>
      </div>
      <div className="bg-white dark:bg-gray-700 rounded shadow p-4 mb-4 max-w-md mx-auto">
        {record.messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg.content} role={msg.role} />
        ))}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">기록 ID: {record.id}</div>
    </div>
  );
} 