import React from 'react';

interface ChatMessageProps {
  message: string;
  role: 'user' | 'ai';
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, role }) => {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[70%] p-3 rounded-lg whitespace-pre-wrap ${isUser
            ? 'bg-blue-500 text-white dark:bg-blue-600 dark:text-gray-100'
            : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100'}`}
      >
        {message}
      </div>
    </div>
  );
};

export default ChatMessage; 