"use client";
import Link from 'next/link';
// import Image from 'next/image'; // next/image 사용하지 않음
import { scenarios } from '../../data/scenarios';
import { useRouter } from 'next/navigation';

// 난이도에 따른 스타일을 반환하는 헬퍼 함수
const getDifficultyChipClass = (difficulty: '상' | '중' | '하') => {
  switch (difficulty) {
    case '하':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case '중':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case '상':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
};

export default function ScenariosPage() {
  const router = useRouter();

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
              <div className="p-5">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {scenario.title}
                  </h5>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getDifficultyChipClass(scenario.difficulty)}`}>
                    난이도 {scenario.difficulty}
                  </span>
                </div>
                <p className="font-normal text-gray-700 dark:text-gray-400 line-clamp-3" style={{ minHeight: '60px' }}>
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