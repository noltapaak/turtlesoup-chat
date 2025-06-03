"use client";
import Link from 'next/link';
import { scenarios } from '../../data/scenarios';

export default function ScenariosPage() {
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">시나리오 선택</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map(scenario => (
          <Link key={scenario.id} href={`/?scenario=${scenario.id}`} passHref>
            <div className="block p-6 bg-white dark:bg-gray-700 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
              <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-200">{scenario.title}</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">{scenario.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 