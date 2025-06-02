"use client";
import React, { useEffect, useState } from 'react';
import { getUserRecords, PlayRecord } from '../../utils/record';
import { getUserId } from '../../utils/user';
import { scenarios } from '../../data/scenarios';
import Link from 'next/link';

export default function HistoryPage() {
  const [records, setRecords] = useState<PlayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      const userId = getUserId();
      const data = await getUserRecords(userId);
      setRecords(data);
      setLoading(false);
    };
    fetchRecords();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h2 className="text-2xl font-bold mb-6">최근 플레이 기록</h2>
      {loading ? (
        <div>불러오는 중...</div>
      ) : records.length === 0 ? (
        <div>플레이 기록이 없습니다.</div>
      ) : (
        <ul className="space-y-4">
          {records.map(r => {
            const scenario = scenarios.find(s => s.id === r.scenarioId);
            return (
              <li key={r.id} className="bg-white p-4 rounded shadow flex flex-col gap-1">
                <div className="font-semibold">{scenario?.title || '시나리오'}</div>
                <div className="text-sm text-gray-600">질문 수: {r.questionCount} / {r.finished ? '성공' : '실패'}</div>
                <Link href={`/record/${r.id}`} className="text-blue-600 hover:underline text-xs mt-1">리플레이 보기</Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
} 