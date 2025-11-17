/**
 * useChat Hook
 * 
 * Manages chat state and diagram generation from AI responses.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { sendChat } from '../lib/openaiClient';
import type { Message } from '../types/index';

// Local storage key for persisting messages
const MESSAGES_KEY = 'diagramchat_messages';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Load messages from localStorage on mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const savedMessages = localStorage.getItem(MESSAGES_KEY);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          setMessages(parsed);
        } catch (e) {
          console.error('Failed to load messages:', e);
        }
      }
    } else {
      // Save messages to localStorage whenever they change
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      metadata: {
        sentiment: 'neutral'
      }
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Prepare messages for API - just send the user message
      const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'user' as const, content: content.trim() }
      ];

      // Call OpenAI - will return diagram JSON
      const diagramJsonString = await sendChat(apiMessages);

      // Parse the diagram JSON
      let diagramSpec;
      try {
        diagramSpec = JSON.parse(diagramJsonString);
      } catch (parseError) {
        console.error('Failed to parse diagram JSON:', parseError);
        throw new Error('Invalid diagram format received from AI');
      }

      // Create assistant message with the diagram spec
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: diagramSpec.title || 'Diagram',
        createdAt: new Date().toISOString(),
        metadata: {
          diagramSpec,
          sentiment: 'neutral'
        }
      };

      setMessages((prev) => [...prev, assistantMessage]);
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

  // Clear all messages
  const clearMessages = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all conversation history?')) {
      localStorage.removeItem(MESSAGES_KEY);
      setMessages([]);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}

