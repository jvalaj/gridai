/**
 * MessageBubble Component
 * 
 * Renders a single chat message with Apple-like styling.
 */

import type { Message } from '../types/index';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div
        className={`max-w-[75%] px-4 py-3 transition-all border rounded-xl ${
          isUser
            ? 'bg-white/5 text-white border-white/15'
            : 'bg-white/3 text-white/90 border-white/10'
        }`}
      >
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap wrap-break-word">
          {message.content}
        </p>
        <span
          className={`text-[11px] mt-1.5 block font-medium ${
            isUser ? 'text-white/50' : 'text-white/40'
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}


