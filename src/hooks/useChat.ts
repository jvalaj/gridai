/**
 * useChat Hook
 * 
 * Manages chat state and interactions:
 * - Message list with context awareness
 * - Semantic relationships between messages
 * - Knowledge graph integration
 * - Message clustering
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { sendChat } from '../lib/openaiClient';
import { splitResponse } from '../lib/responseSplitter';
import { findRelatedMessages, generateEdgesFromContext, clusterMessages, addClusterInfoToNodes } from '../lib/semanticAnalysis';
import { findSimilarMessages } from '../lib/similarity';
import type { Message, GraphNode, GraphEdge, KnowledgeGraph } from '../types';

// Local storage key for persisting the knowledge graph
const KNOWLEDGE_GRAPH_KEY = 'graphchat_knowledge_graph';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph>({
    nodes: [],
    edges: [],
    lastUpdated: new Date().toISOString(),
    version: '1.0'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Load knowledge graph from localStorage on mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const savedGraph = localStorage.getItem(KNOWLEDGE_GRAPH_KEY);
      if (savedGraph) {
        try {
          const parsed = JSON.parse(savedGraph);
          setKnowledgeGraph(parsed);
          setMessages(parsed.nodes);
        } catch (e) {
          console.error('Failed to load knowledge graph:', e);
        }
      }
    } else {
      // Save knowledge graph to localStorage whenever it changes
      localStorage.setItem(KNOWLEDGE_GRAPH_KEY, JSON.stringify(knowledgeGraph));
    }
  }, [knowledgeGraph]);

  // Update the knowledge graph when messages change
  useEffect(() => {
    if (messages.length > 0) {
      updateKnowledgeGraph(messages);
    }
  }, [messages]);

  const updateKnowledgeGraph = async (msgs: Message[]) => {
    try {
      // Cluster messages
      const clusters = clusterMessages(msgs);
      const nodesWithClusters = addClusterInfoToNodes(msgs, clusters);
      
      // Find relationships between messages
      const newEdges: GraphEdge[] = [];
      
      // Find relationships for the latest message
      if (msgs.length > 1) {
        const latestMsg = msgs[msgs.length - 1];
        const related = await findRelatedMessages(latestMsg.content, msgs.slice(0, -1));
        const edges = generateEdgesFromContext(latestMsg.id, related);
        newEdges.push(...edges);
      }
      
      setKnowledgeGraph(prev => ({
        ...prev,
        nodes: nodesWithClusters,
        edges: [...prev.edges, ...newEdges],
        lastUpdated: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error updating knowledge graph:', error);
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      metadata: {
        entities: [], // Will be populated in updateKnowledgeGraph
        topics: [],   // Will be populated in updateKnowledgeGraph
        sentiment: 'neutral'
      }
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Find contextually relevant messages (or use empty array on error)
      let contextMessages: Message[] = [];
      try {
        contextMessages = await findRelatedMessages(content, messages);
      } catch (err) {
        console.warn('Could not find related messages:', err);
      }
      
      const contextIds = contextMessages.map(m => m.id);
      
      // Prepare messages for API with context
      const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system' as const,
          content: 'You are a helpful assistant.'
        }
      ];
      
      // Add context if available
      if (contextIds.length > 0) {
        apiMessages[0].content += ' Consider the following context from previous messages: ' +
          contextIds.map(id => {
            const msg = messages.find(m => m.id === id);
            return msg ? `${msg.role}: ${msg.content}` : '';
          }).filter(Boolean).join('\n');
      }
      
      // Add the current user message
      apiMessages.push({ role: 'user' as const, content: content.trim() });

      // Call OpenAI with context
      const assistantContent = await sendChat(apiMessages);

      // Split response into multiple cards if it's long enough
      const responseId = crypto.randomUUID();
      const splitChunks = splitResponse(assistantContent, responseId);
      
      if (splitChunks.length > 0) {
        // Add all chunks as separate messages
        setMessages((prev) => [...prev, ...splitChunks]);
      } else {
        // If not split, add as single message
        const assistantMessage: Message = {
          id: responseId,
          role: 'assistant',
          content: assistantContent,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Error sending message:', err);
      
      // Remove the user message if there was an error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  /**
   * Generates graph nodes from messages in a tree structure.
   * First message at top, subsequent messages branch downward with horizontal spreading.
   */
  const generateNodes = useCallback((msgs: Message[]): GraphNode[] => {
    if (msgs.length === 0) return [];

    const verticalSpacing = 300; // Space between user-assistant pairs
    const horizontalSpacing = 380; // Horizontal space between sibling responses
    
    // Calculate tree positions - root at top, branches spread horizontally
    const positions: Array<{ x: number; y: number }> = [];
    
    // Track parent-child relationships to build proper tree
    // For now, simple pattern: user messages followed by assistant responses
    // User messages are parents, assistant messages are children
    
    let currentLevel = 0;
    let childrenAtCurrentLevel: number[] = [];
    
    // First message at top center (root of the tree)
    positions.push({ x: 0, y: 0 });
    
    // Build tree structure with horizontal spreading for responses
    for (let i = 1; i < msgs.length; i++) {
      const prevMsg = msgs[i - 1];
      const currentMsg = msgs[i];
      
      if (prevMsg.role === 'user' && currentMsg.role === 'assistant') {
        // This is a response to the previous user message
        currentLevel++;
        childrenAtCurrentLevel = [];
        
        // Position below parent
        const parentPos = positions[i - 1];
        const x = parentPos.x; // Start at parent's x
        const y = parentPos.y + verticalSpacing;
        
        positions.push({ x, y });
        childrenAtCurrentLevel.push(i);
      } else if (prevMsg.role === 'assistant' && currentMsg.role === 'assistant') {
        // Multiple assistant responses to the same user query - spread horizontally
        const parentIndex = childrenAtCurrentLevel.length > 0 ? childrenAtCurrentLevel[0] - 1 : i - 2;
        const parentPos = positions[Math.max(0, parentIndex)];
        
        // Spread children horizontally around parent
        const childIndex = childrenAtCurrentLevel.length;
        const totalChildren = childIndex + 1; // Estimate, will adjust
        const offset = (childIndex - (totalChildren - 1) / 2) * horizontalSpacing;
        
        const x = parentPos.x + offset;
        const y = parentPos.y + verticalSpacing;
        
        positions.push({ x, y });
        childrenAtCurrentLevel.push(i);
      } else {
        // User follow-up or other pattern - place below previous
        const parentPos = positions[i - 1];
        currentLevel++;
        childrenAtCurrentLevel = [];
        
        const x = parentPos.x;
        const y = parentPos.y + verticalSpacing;
        
        positions.push({ x, y });
      }
    }
    
    return msgs.map((msg, index) => ({
      id: msg.id,
      messageId: msg.id,
      x: positions[index]?.x ?? 0,
      y: positions[index]?.y ?? 0,
      fx: null, // Let force simulation refine positions slightly
      fy: null,
      // Use cluster from knowledge graph if available
      cluster: knowledgeGraph.nodes.find(n => n.id === msg.id)?.cluster,
      metadata: {
        ...msg.metadata,
        // Preserve existing metadata or initialize
        entities: msg.metadata?.entities || [],
        topics: msg.metadata?.topics || [],
        sentiment: msg.metadata?.sentiment || 'neutral',
        cluster: knowledgeGraph.nodes.find(n => n.id === msg.id)?.cluster?.toString()
      }
    }));
  }, [knowledgeGraph]);

  /**
   * Generates graph edges from messages.
   * - Chronological edges: connect consecutive messages
   * - Similarity edges: connect semantically similar messages
   */
  const generateEdges = useCallback((msgs: Message[]): GraphEdge[] => {
    // Start with edges from knowledge graph
    const edges = [...knowledgeGraph.edges];
    
    // Add chronological edges
    // Strategy: Connect user messages to their assistant responses,
    // and connect consecutive messages in the chat sequence
    let lastUserMessageId: string | null = null;
    
    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i];
      
      if (msg.role === 'user') {
        // This is a user message - it becomes the parent for subsequent assistant messages
        lastUserMessageId = msg.id;
        
        // Also connect to previous message if it exists (for follow-up questions)
        if (i > 0) {
          const prevMsg = msgs[i - 1];
          const edgeExists = edges.some(
            e => (e.sourceId === prevMsg.id && e.targetId === msg.id) ||
                 (e.sourceId === msg.id && e.targetId === prevMsg.id)
          );
          
          if (!edgeExists && prevMsg.role === 'assistant') {
            edges.push({
              id: `${prevMsg.id}-${msg.id}`,
              sourceId: prevMsg.id,
              targetId: msg.id,
              type: 'chronological'
            });
          }
        }
      } else if (msg.role === 'assistant') {
        // Assistant message - connect to user parent if available
        if (lastUserMessageId) {
          const edgeExists = edges.some(
            e => (e.sourceId === lastUserMessageId && e.targetId === msg.id) ||
                 (e.sourceId === msg.id && e.targetId === lastUserMessageId)
          );
          
          if (!edgeExists) {
            edges.push({
              id: `${lastUserMessageId}-${msg.id}`,
              sourceId: lastUserMessageId,
              targetId: msg.id,
              type: 'chronological'
            });
          }
        }
        
        // Also connect consecutive assistant messages (chunks from same response)
        if (i > 0 && msgs[i - 1].role === 'assistant') {
          const prevMsg = msgs[i - 1];
          const edgeExists = edges.some(
            e => (e.sourceId === prevMsg.id && e.targetId === msg.id) ||
                 (e.sourceId === msg.id && e.targetId === prevMsg.id)
          );
          
          if (!edgeExists) {
            edges.push({
              id: `seq-${prevMsg.id}-${msg.id}`,
              sourceId: prevMsg.id,
              targetId: msg.id,
              type: 'chronological'
            });
          }
        }
      }
    }
    
    // Similarity edges (stubbed for now)
    for (const msg of msgs) {
      const similar = findSimilarMessages(msg, msgs, 0.3, 2);
      for (const similarMsg of similar) {
        // Avoid duplicate edges
        const edgeExists = edges.some(
          e => (e.sourceId === msg.id && e.targetId === similarMsg.id) ||
               (e.sourceId === similarMsg.id && e.targetId === msg.id)
        );
        
        if (!edgeExists) {
          edges.push({
            id: `similarity-${msg.id}-${similarMsg.id}`,
            sourceId: msg.id,
            targetId: similarMsg.id,
            type: 'similarity'
          });
        }
      }
    }

    return edges;
  }, []); // Empty deps - this is a pure function that only depends on its input msgs

  // Clear the knowledge graph (for testing/development)
  const clearKnowledgeGraph = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all conversation history and knowledge graph?')) {
      localStorage.removeItem(KNOWLEDGE_GRAPH_KEY);
      setMessages([]);
      setKnowledgeGraph({
        nodes: [],
        edges: [],
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      });
    }
  }, []);

  return {
    messages,
    knowledgeGraph,
    isLoading,
    error,
    sendMessage,
    clearKnowledgeGraph,
    generateNodes,
    generateEdges,
  };
}

