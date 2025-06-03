"use client";
import React, { useEffect, useState } from 'react';
import { getUserRecords, PlayRecord } from '../../utils/record';
import { getUserId } from '../../utils/user';
import { scenarios } from '../../data/scenarios';
import Link from 'next/link';

export default function HistoryPage() {
  const [records, setRecords] = useState<PlayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    const fetchRecords = async () => {
      if (userId) {
        const userRecords = await getUserRecords(userId);
        setRecords(userRecords);
      }
      setLoading(false);
    };
    fetchRecords();
  }, [userId]);

  if (loading) return <div className="p-6 text-gray-800 dark:text-gray-100">기록을 불러오는 중...</div>;
  if (!records.length) return <div className="p-6 text-gray-800 dark:text-gray-100">플레이 기록이 없습니다.</div>;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">플레이 기록</h1>
      <div className="space-y-4">
        {records.map(record => {
          const scenario = scenarios.find(s => s.id === record.scenarioId);
          return (
            <Link key={record.id} href={`/record/${record.id}`} passHref>
              <div className="block p-4 bg-white dark:bg-gray-700 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">{scenario?.title || '알 수 없는 시나리오'}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">질문 수: {record.questionCount}</p>
                <p className={`text-sm ${record.finished ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {record.finished ? '성공' : '실패'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {new Date(record.timestamp).toLocaleString()}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 