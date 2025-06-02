"use client";
import React, { useEffect, useState } from 'react';
import { getRecordById, PlayRecord } from '../../../utils/record';
import { scenarios } from '../../../data/scenarios';
import ChatMessage from '../../../components/ChatMessage';
import { useParams, useRouter } from 'next/navigation';

export default function RecordReplayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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

  if (loading) return <div className="p-6">불러오는 중...</div>;
  if (!record) return <div className="p-6">기록을 찾을 수 없습니다.</div>;
  const scenario = scenarios.find(s => s.id === record.scenarioId);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto bg-white rounded shadow p-4 mb-6 flex flex-col gap-2">
        <div className="font-bold text-lg">{scenario?.title || '시나리오'}</div>
        <div className="text-gray-700 text-sm">{scenario?.description}</div>
        <div className="text-sm">질문 수: <span className="font-semibold">{record.questionCount}</span></div>
        <div className="text-sm">{record.finished ? '🎉 성공' : '실패'}</div>
        <button onClick={handleCopy} className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs w-fit">{copied ? '복사됨!' : '공유 링크 복사'}</button>
      </div>
      <div className="bg-white rounded shadow p-4 mb-4 max-w-md mx-auto">
        {record.messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg.content} role={msg.role} />
        ))}
      </div>
      <div className="text-xs text-gray-500 max-w-md mx-auto">기록 ID: {record.id}</div>
    </div>
  );
} 