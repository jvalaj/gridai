/**
 * Type definitions for GraphChat
 * 
 * Core data models:
 * - Message: represents a chat message (user or assistant)
 * - GraphNode: represents a node in the force-directed graph
 * - GraphEdge: represents an edge connecting nodes
 */

export type Role = 'user' | 'assistant';

export interface Message {
  id: string;        // UUID
  role: Role;
  content: string;
  createdAt: string; // ISO string
  metadata?: {
    entities?: string[];
    topics?: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    embedding?: number[]; // Vector embedding for semantic similarity
    cluster?: string;
  };
}

export interface GraphNode {
  id: string;        // same as message id
  messageId: string;
  x: number;
  y: number;
  fx?: number | null; // fixed x position (for pinning)
  fy?: number | null; // fixed y position (for pinning)
  vx?: number;       // velocity x
  vy?: number;       // velocity y
}

export interface GraphEdge {
  id: string;
  sourceId: string;  // node id
  targetId: string;  // node id
  type: 'chronological' | 'similarity';
}


