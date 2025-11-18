/**
 * DiagramHistory Component
 * 
 * Shows a list of all generated diagrams with selection capability.
 */

import type { Message } from '../types/index';

interface DiagramHistoryProps {
  messages: Message[];
  selectedMessageId: string | null;
  onSelectDiagram: (messageId: string) => void;
}

export function DiagramHistory({ messages, selectedMessageId, onSelectDiagram }: DiagramHistoryProps) {
  const diagramMessages = messages.filter(
    (m) => m.role === 'assistant' && m.metadata?.diagramSpec
  );

  if (diagramMessages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <p className="text-xs text-white/50">No diagrams yet</p>
          <p className="text-[10px] text-white/30 mt-1">Ask me to create one!</p>
        </div>
      </div>
    );
  }

  const lastDiagramId = diagramMessages[diagramMessages.length - 1]?.id;
  const activeId = selectedMessageId || lastDiagramId;

  return (
    <div className="h-full flex flex-col bg-black/40 backdrop-blur-sm border border-white/10">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-xs font-semibold text-white/90">Chats</h3>
        <p className="text-[10px] text-white/50 mt-0.5">
          {diagramMessages.length} diagram{diagramMessages.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {diagramMessages.slice().reverse().map((msg, idx) => {
          const isSelected = msg.id === activeId;
          return (
            <button
              key={msg.id}
              onClick={() => onSelectDiagram(msg.id)}
              className={`
                w-full text-left px-3 py-2.5 rounded-lg border transition-all
                ${
                  isSelected
                    ? 'bg-white/10 text-white border-white/20 shadow-lg'
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
                  <div className="text-[10px] text-white/40 mt-0.5">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
