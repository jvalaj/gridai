/**
 * DiagramPanel Component
 * 
 * Main diagram visualization panel that shows diagrams from AI responses.
 */

import { useState } from 'react';
import { DiagramCanvas } from './DiagramCanvas';
import type { Message } from '../types/index';

interface DiagramPanelProps {
  messages: Message[];
}

export function DiagramPanel({ messages }: DiagramPanelProps) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Get assistant messages with diagram specs
  const diagramMessages = messages.filter(
    (m) => m.role === 'assistant' && m.metadata?.diagramSpec
  );

  // Get the selected message or the last diagram message
  const selectedMessage =
    diagramMessages.find((m) => m.id === selectedMessageId) || diagramMessages[diagramMessages.length - 1];

  const selectedSpec = selectedMessage?.metadata?.diagramSpec || null;

  return (
    <div className="relative h-full bg-white overflow-hidden">
      {/* Diagram selector if multiple diagrams exist */}
      {diagramMessages.length > 1 && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 max-w-xs">
            <p className="text-xs font-medium text-gray-700 mb-2 px-2">Recent Diagrams</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {diagramMessages.slice().reverse().map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => setSelectedMessageId(msg.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded text-xs
                    transition-colors duration-150
                    ${
                      msg.id === (selectedMessage?.id || diagramMessages[diagramMessages.length - 1]?.id)
                        ? 'bg-black text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <div className="font-medium truncate">
                    {msg.metadata?.diagramSpec?.title || 'Diagram'}
                  </div>
                  <div className="text-[10px] opacity-70 capitalize">
                    {msg.metadata?.diagramSpec?.type.replace('-', ' ')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <DiagramCanvas spec={selectedSpec} />
    </div>
  );
}
