/**
 * App Component
 * 
 * Main application component that orchestrates:
 * - Chat functionality
 * - Graph visualization
 * - State management
 * 
 * Architecture:
 * - Two-column layout (chat left, graph right)
 * - Responsive: stacks on mobile
 * - Apple-like design with system fonts and minimal styling
 */

import { useMemo } from 'react';
import { useChat } from './hooks/useChat';
import { useForceGraph } from './hooks/useForceGraph';
import { ChatPanel } from './components/ChatPanel';
import { GraphPanel } from './components/GraphPanel';

function App() {
  const { messages, isLoading, error, sendMessage, generateNodes, generateEdges, clearKnowledgeGraph } = useChat();
  
  // Memoize node and edge generation to prevent unnecessary recalculations
  const nodes = useMemo(() => generateNodes(messages), [messages, generateNodes]);
  const edges = useMemo(() => generateEdges(messages), [messages, generateEdges]);
  
  const { nodes: simulationNodes, links: simulationLinks, pinNode } = useForceGraph(nodes, edges);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f5f5f7] overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <h1 className="text-lg font-medium text-gray-900">GraphChat</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={clearKnowledgeGraph}
            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear All
          </button>
          <p className="text-xs text-gray-400">Powered by OpenAI</p>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-8 py-2 bg-red-50 border-b border-red-100">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Chat panel */}
        <div className="w-full md:w-[420px] flex-shrink-0">
          <ChatPanel
            messages={messages}
            onSend={sendMessage}
            isLoading={isLoading}
          />
        </div>

        {/* Graph panel */}
        <div className="flex-1 hidden md:block">
          <GraphPanel
            nodes={simulationNodes}
            links={simulationLinks}
            messages={messages}
            pinNode={pinNode}
          />
        </div>
      </main>
    </div>
  );
}

export default App;

