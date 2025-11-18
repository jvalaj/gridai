/**
 * App Component
 * 
 * Main application component that orchestrates:
 * - Chat functionality
 * - Diagram visualization (powered by tldraw)
 * - State management
 * 
 * Architecture:
 * - Two-column layout (chat left, diagram right)
 * - Responsive: stacks on mobile
 * - Apple-like design with system fonts and minimal styling
 */

import React from 'react';
import { useChat } from './hooks/useChat';
import { DiagramPanel } from './components/DiagramPanel';
import { ResizablePanel } from './components/ResizablePanel';
import logoUrl from './gridailogo.png';

function App() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();
  const [selectedMessageId, setSelectedMessageId] = React.useState<string | null>(null);

  return (
    <div className="h-screen w-screen flex flex-col bg-black overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="grid logo" className="h-6 w-6 rounded-full border border-white" />
          <h1 className="text-lg text-white tracking-tight" style={{ fontFamily: '"Doto", sans-serif', fontWeight: 800 }}>Grid.</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={clearMessages}
            className="px-4 py-1.5 text-xs font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full transition-all"
          >
            Clear All Messages
          </button>
          <p className="text-xs text-white/40 font-medium">Powered by OpenAI</p>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-8 py-3 bg-white/5 backdrop-blur-sm border-b border-white/10">
          <p className="text-base text-white/80">{error}</p>
        </div>
      )}

      {/* Main content - Claude-like layout */}
      <main className="flex-1 flex overflow-hidden">
        <ResizablePanel direction="horizontal" initialSize={280} minSize={240} maxSize={400}>
          {/* Left sidebar: Diagram history only */}
          <div className="h-full border-r border-white/10">
            <DiagramPanel 
              messages={messages} 
              onQuickPrompt={sendMessage}
              selectedMessageId={selectedMessageId}
              onSelectMessage={setSelectedMessageId}
              isLoading={isLoading}
            />
          </div>

          {/* Right main area: Diagram canvas with chat input at bottom */}
          <div className="flex-1 h-full flex flex-col">
            <DiagramPanel 
              messages={messages} 
              onQuickPrompt={sendMessage} 
              isMainCanvas
              selectedMessageId={selectedMessageId}
              onSelectMessage={setSelectedMessageId}
              isLoading={isLoading}
            />
          </div>
        </ResizablePanel>
      </main>
    </div>
  );
}

export default App;

