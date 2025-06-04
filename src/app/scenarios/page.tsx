"use client";
import Link from 'next/link';
// import Image from 'next/image'; // next/image 사용하지 않음
import { scenarios } from '../../data/scenarios';

export default function ScenariosPage() {
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">채팅형 추리게임</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map(scenario => (
          <Link key={scenario.id} href={`/?scenario=${scenario.id}`} passHref>
            <div className="block bg-white dark:bg-gray-700 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
              {scenario.image && scenario.image.startsWith('/images/') && (
                <div className="relative w-full h-48 md:h-56">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={scenario.image} // public 폴더 기준 경로
                    alt={scenario.title}
                    // layout="fill" objectFit="cover" className="..." 대신 style 사용 또는 CSS로 제어
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    className="dark:brightness-90"
                  />
                </div>
              )}
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-200">{scenario.title}</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">
                  {scenario.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 