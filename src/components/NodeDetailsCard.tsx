/**
 * NodeDetailsCard Component
 * 
 * Floating card that shows full message content when a node is clicked.
 */

import { X } from 'lucide-react';
import type { Message } from '../types/index';

interface NodeDetailsCardProps {
  message: Message | null;
  onClose: () => void;
}

export function NodeDetailsCard({ message, onClose }: NodeDetailsCardProps) {
  if (!message) return null;

  const isUser = message.role === 'user';

  return (
    <div className="absolute top-4 right-4 w-80 bg-slate-900/90 rounded-lg shadow-xl border border-slate-700/50 p-4 animate-in fade-in slide-in-from-right-2 duration-200 z-10 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-3">
        <span
          className={`text-xs font-medium px-2 py-1 rounded border ${
            isUser
              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
              : 'bg-slate-800/50 text-gray-300 border-slate-700/50'
          }`}
        >
          {isUser ? 'User' : 'Assistant'}
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-300 transition-colors p-1"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap wrap-break-word">
        {message.content}
      </p>
      <span className="text-xs text-gray-500 mt-2 block">
        {new Date(message.createdAt).toLocaleString()}
      </span>
    </div>
  );
}


