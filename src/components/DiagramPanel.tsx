/**
 * DiagramPanel Component
 * 
 * Main diagram visualization panel that shows diagrams from AI responses.
 */

import { DiagramCanvas } from './DiagramCanvas';
import type { Message } from '../types/index';
import logoUrl from '../gridailogo.png';

interface DiagramPanelProps {
  messages: Message[];
  onQuickPrompt?: (text: string) => void;
  isMainCanvas?: boolean;
  selectedMessageId: string | null;
  onSelectMessage: (id: string) => void;
  isLoading?: boolean;
}

export function DiagramPanel({ messages, onQuickPrompt, isMainCanvas = false, selectedMessageId, onSelectMessage, isLoading = false }: DiagramPanelProps) {

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

  // History mode - show compact diagram list
  if (!isMainCanvas) {
    return (
      <div className="h-full flex flex-col bg-black/60 backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-xs font-semibold text-white/90">Diagram History</h3>
          <p className="text-[10px] text-white/50 mt-0.5">
            {diagramMessages.length} diagram{diagramMessages.length !== 1 ? 's' : ''}
          </p>
        </div>
        {diagramMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <p className="text-xs text-white/50">No diagrams yet</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {diagramMessages.slice().reverse().map((msg, idx) => {
              const isSelected = msg.id === (selectedMessage?.id || diagramMessages[diagramMessages.length - 1]?.id);
              return (
                <button
                  key={msg.id}
                  onClick={() => onSelectMessage(msg.id)}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-lg border transition-all
                    ${
                      isSelected
                        ? 'bg-white/10 text-white border-white/20'
                        : 'bg-white/5 hover:bg-white/8 text-white/70 border-white/10 hover:border-white/15'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold text-white/80">
                      {diagramMessages.length - idx}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate mb-0.5">
                        {msg.metadata?.diagramSpec?.title || 'Untitled Diagram'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-white/50">
                        <span className="capitalize">
                          {msg.metadata?.diagramSpec?.type.replace('-', ' ')}
                        </span>
                        <span>•</span>
                        <span>{msg.metadata?.diagramSpec?.nodes.length || 0} nodes</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Main canvas mode - show full diagram with starter prompts
  return (
    <div className="relative h-full bg-black overflow-hidden">
      {/* Loading overlay with blur */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin" />
            <p className="text-sm text-white/70 font-medium">Generating diagram...</p>
          </div>
        </div>
      )}
      {!hasDiagram && (
        <div className="h-full w-full flex items-center justify-center px-6">
          <div className="max-w-3xl w-full text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logoUrl} alt="grid logo" className="h-16 w-16 rounded-full bg-white" />
              <h1 className="text-4xl text-white tracking-tight" style={{ fontFamily: '"Doto", sans-serif', fontWeight: 900 }}>Grid.</h1>
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

      {hasDiagram && <DiagramCanvas spec={selectedSpec} />}
    </div>
  );
}
