import React from 'react';

interface ChatMessageProps {
  message: string;
  role: 'user' | 'ai';
}

export default function ChatMessage({ message, role }: ChatMessageProps) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-xs px-4 py-2 rounded-lg shadow text-sm whitespace-pre-line break-words '
          ${role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-900 rounded-bl-none'}`}
      >
        {message}
      </div>
    </div>
  );
} 