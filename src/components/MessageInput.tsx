/**
 * MessageInput Component
 * 
 * Input field and send button for new messages.
 * Apple-like styling with smooth interactions.
 */

import { useState, FormEvent, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
  variant?: 'dark' | 'light';
}

export function MessageInput({ onSend, isLoading, variant = 'dark' }: MessageInputProps) {
  const isLight = variant === 'light';
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={isLight ? "px-6 py-4" : "border-t border-gray-200 bg-white/90 backdrop-blur-xl px-6 py-4"}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you want visualized?"
            disabled={isLoading}
            rows={1}
            className={`w-full resize-none rounded-full border px-4 py-3 text-[14px] focus:outline-none focus:ring-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed caret-gray-900 ${
              isLight
                ? 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-gray-300/25'
                : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-500/25'
            }`}
            style={{
              minHeight: '44px',
              maxHeight: '120px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed ${
            isLight
              ? 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-300/25'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-blue-500/25'
          }`}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
}


