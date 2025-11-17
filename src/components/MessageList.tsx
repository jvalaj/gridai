/**
 * MessageList Component
 * 
 * Scrollable container for chat messages.
 */

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingDots } from './LoadingDots';
import type { Message } from '../types/index';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p className="text-sm font-medium">Start a conversation...</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto px-6 py-4 space-y-1 scroll-smooth"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="flex justify-start mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="px-3 py-2.5 transition-all border rounded-xl bg-white/3 text-white/90 border-white/10">
            <LoadingDots />
          </div>
        </div>
      )}
    </div>
  );
}


