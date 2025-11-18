/**
 * DiagramPanel Component
 * 
 * Main diagram visualization panel that shows diagrams from AI responses.
 */

import { DiagramCanvas } from './DiagramCanvas';
import { MessageInput } from './MessageInput';
import type { Message } from '../types/index';
import logoUrl from '../gridailogo.png';

interface DiagramPanelProps {
  messages: Message[];
  onQuickPrompt?: (text: string) => void;
  isMainCanvas?: boolean;
  selectedMessageId: string | null;
  onSelectMessage: (id: string) => void;
  onDeleteMessage?: (id: string) => void;
  onClearAll?: () => void;
  isLoading?: boolean;
  onCancelGeneration?: () => void;
}

export function DiagramPanel({ messages, onQuickPrompt, isMainCanvas = false, selectedMessageId, onSelectMessage, onDeleteMessage, onClearAll, isLoading = false, onCancelGeneration }: DiagramPanelProps) {

  // Get assistant messages with diagram specs
  const diagramMessages = messages.filter(
    (m) => m.role === 'assistant' && m.metadata?.diagramSpec
  );

  // Get the selected message
  const selectedMessage = selectedMessageId 
    ? diagramMessages.find((m) => m.id === selectedMessageId)
    : null;

  const selectedSpec = selectedMessage?.metadata?.diagramSpec || null;

  const starterPrompts: { title: string; prompt: string }[] = [
    { title: 'Microservices Architecture', prompt: 'Use a deployment diagram: Show a microservices architecture with API gateway, services, and databases' },
    { title: 'OAuth 2.0 Flow', prompt: 'Use a sequence diagram: Explain the OAuth 2.0 authorization code flow with all participants' },
    { title: 'CI/CD Pipeline', prompt: 'Use a timeline diagram: Sketch a complete CI/CD pipeline from code to production' },
    { title: 'HTTP Request Lifecycle', prompt: 'Use a sequence diagram: Explain the complete HTTP request lifecycle from browser to server' },
    { title: 'User Authentication', prompt: 'Use a state-machine diagram: Show a comprehensive user login/authentication lifecycle with security' },
    { title: 'Database Design', prompt: 'Use an entity-relationship diagram: Design a database schema for an e-commerce platform' },
    { title: 'API Architecture', prompt: 'Use a network diagram: Show a REST API architecture with authentication and rate limiting' },
    { title: 'Event-Driven System', prompt: 'Use a network diagram: Design an event-driven microservices architecture' },
    { title: 'Container Orchestration', prompt: 'Use a deployment diagram: Show Kubernetes pod deployment and service communication' },
  ];

  const hasDiagram = !!selectedSpec;

  // History mode - show compact diagram list
  if (!isMainCanvas) {
    return (
      <div className="h-full flex flex-col bg-gray-100 backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-gray-500">
          <button
            onClick={() => onSelectMessage(null as any)}
            className="w-full mb-3 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-lg">Chats</h3>
            {onClearAll && diagramMessages.length > 0 && (
              <button
                onClick={onClearAll}
                className="px-2 py-1 font-medium text-white hover:text-white bg-red-500/90 hover:bg-red-500 rounded transition-all"
                title="Clear all diagrams"
              >
                Clear All
              </button>
            )}
          </div>
          <p className="text-gray-600 text-sm">
            {diagramMessages.length} diagram{diagramMessages.length !== 1 ? 's' : ''}
          </p>
        </div>
        {diagramMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <p className="text-xs text-gray-500">No diagrams yet</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {diagramMessages.slice().reverse().map((msg, idx) => {
              const isSelected = msg.id === (selectedMessage?.id || diagramMessages[diagramMessages.length - 1]?.id);
              return (
                <div
                  key={msg.id}
                  className={`
                    w-full rounded-lg border transition-all group relative
                    ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <button
                    onClick={() => onSelectMessage(msg.id)}
                    className="w-full text-left px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                        {diagramMessages.length - idx}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base truncate mb-0.5">
                          {msg.metadata?.diagramSpec?.title || 'Untitled Diagram'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="capitalize">
                            {msg.metadata?.diagramSpec?.type.replace('-', ' ')}
                          </span>
                          <span>•</span>
                          <span>{msg.metadata?.diagramSpec?.nodes.length || 0} nodes</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  {onDeleteMessage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this diagram?')) {
                          onDeleteMessage(msg.id);
                          if (isSelected) onSelectMessage(null as any);
                        }
                      }}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-red-900 text-gray-400 hover:text-red-500 transition-colors bg-slate-200"
                      title="Delete diagram"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Main canvas mode - show full diagram with chat input at bottom
  return (
    <div className="relative h-full bg-white overflow-hidden flex flex-col">
      {/* gridailogo background for starter screen */}
      {!hasDiagram && (
        <div className="absolute inset-0 gridailogo-bg" aria-hidden="true" />
      )}
      {/* Loading overlay with blur */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            <p className="text-base text-gray-700 font-medium">Generating diagram...</p>
            {onCancelGeneration && (
              <button
                onClick={onCancelGeneration}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Diagram area */}
      <div className="flex-1 overflow-hidden relative">
        {!hasDiagram && (
          <div className="relative h-full w-full flex items-center justify-center px-6 z-10">
            <div className="max-w-3xl w-full text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img src={logoUrl} alt="grid logo" className="h-16 w-16 rounded-full bg-white" />
                <h1 className="text-5xl text-black tracking-tight" style={{ fontFamily: '"Doto", sans-serif', fontWeight: 900 }}>Grid.</h1>
              </div>
            
               {/* Input bar in the middle */}
              <div className="mb-8 max-w-2xl mx-auto">
                <MessageInput onSend={onQuickPrompt!} isLoading={isLoading} variant="light" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mx-auto">
                {starterPrompts.map(({ title, prompt }) => (
                  <button
                    key={title}
                    onClick={() => onQuickPrompt && onQuickPrompt(prompt)}
                    className="text-left rounded-xl border border-gray-300 bg-white/80 hover:bg-white text-gray-900 px-4 py-3 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <div className="text-base font-medium">{title}</div>
                    <div className=" text-gray-600 mt-1">{prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasDiagram && <DiagramCanvas spec={selectedSpec} messageId={selectedMessage?.id} />}
      </div>
      
      {/* Disabled input placeholder at bottom (only show when there's a diagram) */}
      {hasDiagram && (
        <div className="border-t border-gray-200 bg-white/90 px-6 py-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60">
            <div className="flex-1">
              <p className="text-sm text-gray-600 font-medium">Work in progress: Editing diagrams with text</p>
            </div>
            <div className="w-10 h-10 rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
