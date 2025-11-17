/**
 * MessageBubble Component
 * 
 * Renders a single chat message with Apple-like styling.
 */

import { useState, useEffect } from 'react';
import type { Message } from '../types/index';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [displayedContent, setDisplayedContent] = useState(isUser ? message.content : '');
  const [isTyping, setIsTyping] = useState(!isUser);

  useEffect(() => {
    if (isUser) return;

    let index = 0;
    const content = message.content;
    setDisplayedContent('');
    setIsTyping(true);

    const typeInterval = setInterval(() => {
      if (index < content.length) {
        setDisplayedContent(content.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typeInterval);
      }
    }, 15);

    return () => clearInterval(typeInterval);
  }, [message.content, isUser]);

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div
        className={`max-w-[75%] px-3 py-2.5 transition-all border rounded-xl ${
          isUser
            ? 'bg-amber-100/90 text-gray-900 border-amber-200/50'
            : 'bg-white/3 text-white/90 border-white/10'
        }`}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap wrap-break-word">
          {displayedContent}
          {isTyping && <span className="inline-block w-1.5 h-4 ml-0.5 bg-white/60 animate-pulse" />}
        </p>
        <span
          className={`text-[11px] mt-1 block font-medium ${
            isUser ? 'text-gray-600' : 'text-white/40'
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


