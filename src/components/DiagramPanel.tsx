/**
 * DiagramPanel Component
 * 
 * Main diagram visualization panel that shows diagrams from AI responses.
 */

import { useState } from 'react';
import { DiagramCanvas } from './DiagramCanvas';
import type { Message } from '../types/index';
import logoUrl from '../gridailogo.png';

interface DiagramPanelProps {
  messages: Message[];
  onQuickPrompt?: (text: string) => void;
}

export function DiagramPanel({ messages, onQuickPrompt }: DiagramPanelProps) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Get assistant messages with diagram specs
  const diagramMessages = messages.filter(
    (m) => m.role === 'assistant' && m.metadata?.diagramSpec
  );

  // Get the selected message or the last diagram message
  const selectedMessage =
    diagramMessages.find((m) => m.id === selectedMessageId) || diagramMessages[diagramMessages.length - 1];

  const selectedSpec = selectedMessage?.metadata?.diagramSpec || null;

  const starterPrompts: { title: string; prompt: string }[] = [
    { title: 'Microservices Architecture', prompt: 'Show a microservices architecture' },
    { title: 'OAuth 2.0 Flow', prompt: 'Explain the OAuth 2.0 authorization code flow' },
    { title: 'CI/CD Pipeline', prompt: 'Sketch a CI/CD pipeline' },
    { title: 'HTTP Request Lifecycle', prompt: 'Explain the HTTP request lifecycle' },
    { title: 'User Authentication', prompt: 'Show a user login/authentication flow' },
  ];

  const hasDiagram = !!selectedSpec;

  return (
    <div className="relative h-full bg-black overflow-hidden">
      {!hasDiagram && (
        <div className="h-full w-full flex items-center justify-center px-6">
          <div className="max-w-3xl w-full text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logoUrl} alt="grid logo" className="h-16 w-16 ounded-full bg-white" />
              <h1 className="text-4xl font-semibold text-white tracking-tight">Grid.</h1>
            </div>
            <p className="text-sm text-white/60 mb-8">Pick a starting point or ask anything.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mx-auto">
              {starterPrompts.map(({ title, prompt }) => (
                <button
                  key={title}
                  onClick={() => onQuickPrompt && onQuickPrompt(prompt)}
                  className="text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white px-4 py-3 transition-colors focus:outline-none focus:ring-1 focus:ring-white/10"
                >
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-white/60 mt-1">{prompt}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Diagram selector if multiple diagrams exist */}
      {diagramMessages.length > 1 && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-black/60 rounded-xl border border-white/10 p-2 max-w-xs backdrop-blur-sm shadow-lg">
            <p className="text-xs font-semibold text-white/80 mb-2 px-2">Recent Diagrams</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {diagramMessages.slice().reverse().map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => setSelectedMessageId(msg.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-xs border
                    transition-colors duration-150
                    ${
                      msg.id === (selectedMessage?.id || diagramMessages[diagramMessages.length - 1]?.id)
                        ? 'bg-white/10 text-white border-white/20'
                        : 'hover:bg-white/5 text-white/70 border-transparent'
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

      {hasDiagram && <DiagramCanvas spec={selectedSpec} />}
    </div>
  );
}
