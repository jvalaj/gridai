export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  contextIds?: string[]; // IDs of related messages
  metadata?: {
    entities?: string[]; // Extracted entities
    topics?: string[];   // Detected topics
    sentiment?: 'positive' | 'neutral' | 'negative';
    embedding?: number[]; // Vector embedding for semantic similarity
  };
}

export interface GraphNode extends Message {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  cluster?: string | number;
  level?: number;
}

export interface GraphEdge {
  id: string;
  sourceId: string; // source node ID
  targetId: string; // target node ID
  type: 'chronological' | 'similarity' | 'response' | 'reference' | 'context' | 'implicit';
  strength?: number; // 0-1 indicating relationship strength
  label?: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  lastUpdated: string;
  version: string;
}

// For semantic search and clustering
export interface SemanticNode {
  id: string;
  embedding: number[];
  text: string;
  timestamp: number;
}
