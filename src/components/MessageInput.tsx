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
      className="border-t border-white/10 bg-black/60 backdrop-blur-xl px-6 py-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            rows={1}
            className="w-full resize-none rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-[#3A6CF4]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-all hover:bg-white/10 hover:border-white/25 focus:outline-none focus:ring-1 focus:ring-[#3A6CF4]/25 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
}


