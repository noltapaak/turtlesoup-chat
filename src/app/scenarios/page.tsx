"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { scenarios } from '../../data/scenarios';

export default function ScenariosPage() {
  const router = useRouter();

  const handleSelect = (id: string) => {
    // 시나리오 선택 시 메인 페이지로 이동 (id 쿼리 전달)
    router.push(`/?scenario=${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h2 className="text-2xl font-bold mb-6">시나리오 선택</h2>
      <ul className="space-y-4">
        {scenarios.map(s => (
          <li key={s.id} className="bg-white p-4 rounded shadow cursor-pointer hover:bg-blue-50" onClick={() => handleSelect(s.id)}>
            <div className="font-semibold text-lg">{s.title}</div>
            <div className="text-gray-600 text-sm mt-1">{s.description}</div>
          </li>
        ))}
      </ul>
    </div>
  );
} 