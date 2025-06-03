import React, { useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-700 shadow flex items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="질문을 입력하세요..."
        disabled={disabled}
        className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500 dark:placeholder-gray-400"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-500"
      >
        전송
      </button>
    </form>
  );
};

export default ChatInput; 