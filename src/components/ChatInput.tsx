import React, { useState } from 'react';

interface ChatInputProps {
  onSend: (value: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (value.trim()) {
      onSend(value);
      setValue('');
    }
  };

  return (
    <div className="flex gap-2 p-2 border-t bg-white">
      <input
        className="flex-1 px-3 py-2 border rounded focus:outline-none"
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        placeholder="질문 또는 정답을 입력하세요"
        disabled={disabled}
      />
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
      >
        전송
      </button>
    </div>
  );
} 