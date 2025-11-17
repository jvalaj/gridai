/**
 * ChatPanel Component
 * 
 * Main chat interface panel with message list and input.
 */

import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Message } from '../types';

interface ChatPanelProps {
  messages: Message[];
  onSend: (content: string) => void;
  isLoading: boolean;
}

export function ChatPanel({ messages, onSend, isLoading }: ChatPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="flex-1 min-h-0 overflow-hidden">
        <MessageList messages={messages} />
      </div>
      <div className="flex-shrink-0">
        <MessageInput onSend={onSend} isLoading={isLoading} />
      </div>
    </div>
  );
}


