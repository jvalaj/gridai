/**
 * MessageBubble Component
 * 
 * Renders a single chat message with Apple-like styling.
 */

import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition-all hover:shadow-md ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-900 border border-gray-100'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <span
          className={`text-xs mt-1 block ${
            isUser ? 'text-blue-100' : 'text-gray-400'
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


