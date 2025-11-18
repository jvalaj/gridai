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
  const { messages, isLoading, error, sendMessage, clearMessages, deleteMessage, cancelGeneration } = useChat();
  const [selectedMessageId, setSelectedMessageId] = React.useState<string | null>(null);
  const [userClickedHome, setUserClickedHome] = React.useState(false);

  // Auto-select the latest diagram when a new one arrives
  React.useEffect(() => {
    const diagramMessages = messages.filter(m => m.role === 'assistant' && m.metadata?.diagramSpec);
    if (diagramMessages.length > 0) {
      const latestDiagram = diagramMessages[diagramMessages.length - 1];
      // Only auto-select if we're not already viewing a specific diagram or if this is a new diagram
      if (!selectedMessageId || !userClickedHome) {
        setSelectedMessageId(latestDiagram.id);
        setUserClickedHome(false); // Reset the flag when auto-selecting
      }
    }
  }, [messages]);

  const handleGoHome = () => {
    setSelectedMessageId(null);
    setUserClickedHome(true);
  };

  const handleSelectMessage = (id: string | null) => {
    setSelectedMessageId(id);
    setUserClickedHome(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-200 overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4 bg-white/90 backdrop-blur-xl border-b border-gray-200">
        <button 
          onClick={handleGoHome}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <img src={logoUrl} alt="grid logo" className="h-6 w-6 rounded-full border-2 border-gray-800" />
          <h1 className="text-2xl text-gray-900 tracking-tight" style={{ fontFamily: '"Doto", sans-serif', fontWeight: 800 }}>Grid.</h1>
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-8 py-3 bg-red-500/10 backdrop-blur-sm border-b border-red-500/30">
          <p className="text-base text-red-200">{error}</p>
        </div>
      )}

      {/* Main content - Claude-like layout */}
      <main className="flex-1 flex overflow-hidden">
        <ResizablePanel direction="horizontal" initialSize={280} minSize={240} maxSize={400}>
          {/* Left sidebar: Diagram history only */}
          <div className="h-full border-r border-slate-700/50">
            <DiagramPanel 
              messages={messages} 
              onQuickPrompt={sendMessage}
              selectedMessageId={selectedMessageId}
              onSelectMessage={handleSelectMessage}
              onDeleteMessage={deleteMessage}
              onClearAll={clearMessages}
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
              onSelectMessage={handleSelectMessage}
              isLoading={isLoading}
              onCancelGeneration={cancelGeneration}
            />
          </div>
        </ResizablePanel>
      </main>
    </div>
  );
}

export default App;

