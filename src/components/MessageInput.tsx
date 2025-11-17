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
}

export function MessageInput({ onSend, isLoading }: MessageInputProps) {
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
      className="border-t border-gray-100 bg-white px-6 py-4"
    >
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            rows={1}
            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              minHeight: '44px',
              maxHeight: '120px',
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
          className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white transition-all hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
}


