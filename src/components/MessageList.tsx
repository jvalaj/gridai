/**
 * MessageList Component
 * 
 * Scrollable container for chat messages.
 */

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../types';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p className="text-sm">Start a conversation...</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-6 py-4 space-y-1 scroll-smooth"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}


