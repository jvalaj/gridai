export interface DiagramNode {
  id: string;
  label: string;
  kind: 'actor' | 'service' | 'db' | 'queue' | 'component' | 'process' | 'cache' | 'storage' | 'external' | 'ui' | 'api' | 'gateway' | 'lb' | 'loadbalancer' | 'worker' | 'note' | 'annotation' | 'server' | 'client' | 'mobile' | 'browser' | 'container' | 'function' | 'lambda' | 'cdn' | 'firewall' | 'router' | 'switch' | 'monitoring' | 'analytics' | 'auth' | 'payment' | 'email' | 'notification' | 'file' | 'log' | 'backup' | 'scheduler' | 'orchestrator' | 'registry' | 'search' | 'stream' | 'pubsub' | 'webhook' | 'proxy' | 'other';
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramSpec {
  type: 'directed-graph' | 'sequence' | 'tree' | 'flowchart' | 'state-machine' | 'entity-relationship' | 'network' | 'timeline' | 'class-diagram' | 'deployment';
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface LayoutOptions {
  orientation?: 'LR' | 'TB';
  edgeStyle?: 'orthogonal' | 'curved' | 'straight';
  spacing?: 'compact' | 'cozy' | 'spacious';
}

export interface VisualizationPlan {
  intent?: string;
  type_choice?: string;
  steps?: string[];
  alternatives?: Array<{ title?: string; when?: string }>;
}

export interface AssistantVariant {
  title?: string;
  diagram: DiagramSpec;
}

export interface AssistantEnvelope {
  message?: string; // short assistant reply to display in chat
  diagram: DiagramSpec; // primary diagram to render
  plan?: VisualizationPlan; // reasoning and steps
  layoutOptions?: LayoutOptions; // rendering preferences
  variants?: AssistantVariant[]; // optional alternative diagrams
}

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
    diagramSpec?: DiagramSpec; // Diagram specification from AI
    plan?: VisualizationPlan;
    layoutOptions?: LayoutOptions;
    variants?: AssistantVariant[];
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

export type Role = 'user' | 'assistant' | 'system';
