/**
 * NodeDetailsCard Component
 * 
 * Floating card that shows full message content when a node is clicked.
 */

import { X } from 'lucide-react';
import type { Message } from '../types';

interface NodeDetailsCardProps {
  message: Message | null;
  onClose: () => void;
}

export function NodeDetailsCard({ message, onClose }: NodeDetailsCardProps) {
  if (!message) return null;

  const isUser = message.role === 'user';

  return (
    <div className="absolute top-4 right-4 w-80 bg-white rounded-2xl shadow-lg border border-gray-100 p-4 animate-in fade-in slide-in-from-right-2 duration-200 z-10">
      <div className="flex items-start justify-between mb-3">
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            isUser
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {isUser ? 'User' : 'Assistant'}
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
        {message.content}
      </p>
      <span className="text-xs text-gray-400 mt-2 block">
        {new Date(message.createdAt).toLocaleString()}
      </span>
    </div>
  );
}


