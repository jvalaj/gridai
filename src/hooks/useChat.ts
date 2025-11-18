/**
 * useChat Hook
 * 
 * Manages chat state and diagram generation from AI responses.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { sendChat } from '../lib/openaiClient';
import type { Message, Role } from '../types/index';

// Local storage key for persisting messages
const MESSAGES_KEY = 'diagramchat_messages';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Prepare messages for API - just send the user message
      const apiMessages: Array<{ role: Role; content: string }> = [
        { role: 'user', content: content.trim() }
      ];

      // Call OpenAI - returns JSON envelope or raw diagram JSON
      const payloadString = await sendChat(apiMessages);

      // Parse the response
      let diagramSpec: any = null;
      let assistantText = '';
      let plan: any = undefined;
      let layoutOptions: any = undefined;
      let variants: any = undefined;
      try {
        const parsed = JSON.parse(payloadString);
        if (parsed && parsed.diagram) {
          diagramSpec = parsed.diagram;
          assistantText = parsed.message || parsed.diagram?.title || 'Diagram';
          plan = parsed.plan;
          layoutOptions = parsed.layoutOptions;
          variants = parsed.variants;
        } else {
          // Backward compatibility when model returns raw diagram spec
          diagramSpec = parsed;
          assistantText = parsed.title || 'Diagram';
        }
      } catch (parseError) {
        console.error('Failed to parse AI JSON:', parseError);
        throw new Error('Invalid JSON received from AI');
      }

      // Create assistant message with the diagram spec and optional plan
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantText,
        createdAt: new Date().toISOString(),
        metadata: {
          diagramSpec,
          sentiment: 'neutral',
          plan,
          layoutOptions,
          variants,
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
      abortControllerRef.current = null;
    }
  }, [messages, isLoading]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all conversation history?')) {
      localStorage.removeItem(MESSAGES_KEY);
      setMessages([]);
    }
  }, []);

  // Cancel ongoing generation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setError('Generation cancelled');
    }
  }, []);

  // Delete a specific message pair (user + assistant)
  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => {
      // Find the assistant message with this ID
      const msgIndex = prev.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return prev;
      
      // Find the corresponding user message (the one right before the assistant message)
      const newMessages = [...prev];
      if (msgIndex > 0 && newMessages[msgIndex - 1].role === 'user') {
        // Remove both user and assistant messages
        newMessages.splice(msgIndex - 1, 2);
      } else {
        // Just remove the assistant message
        newMessages.splice(msgIndex, 1);
      }
      return newMessages;
    });
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    deleteMessage,
    cancelGeneration,
  };
}

