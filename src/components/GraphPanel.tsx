/**
 * GraphPanel Component
 * 
 * Main graph visualization panel with card-based canvas.
 */

import { useState } from 'react';
import { GraphCanvas } from './GraphCanvas';
import { NodeDetailsCard } from './NodeDetailsCard';
import type { SimulationNode, SimulationLink } from '../lib/graphEngine';
import type { Message } from '../types/index';

interface GraphPanelProps {
  nodes: SimulationNode[];
  links: SimulationLink[];
  messages: Message[];
  pinNode: (nodeId: string, x: number | null, y: number | null) => void;
}

export function GraphPanel({ nodes, links, messages, pinNode }: GraphPanelProps) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const selectedMessage = selectedMessageId
    ? messages.find((m) => m.id === selectedMessageId) || null
    : null;

  return (
    <div className="relative h-full bg-white overflow-hidden border-l border-gray-100">
      <GraphCanvas
        nodes={nodes}
        links={links}
        messages={messages}
        onNodeClick={setSelectedMessageId}
        pinNode={pinNode}
      />
      <NodeDetailsCard
        message={selectedMessage}
        onClose={() => setSelectedMessageId(null)}
      />
    </div>
  );
}
