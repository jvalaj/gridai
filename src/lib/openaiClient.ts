/**
 * OpenAI API Client
 * 
 * Handles communication with OpenAI's Chat Completions API.
 * 
 * Setup:
 * 1. Create a .env file in the project root
 * 2. Add: VITE_OPENAI_API_KEY=your_api_key_here
 * 3. The client will read from import.meta.env.VITE_OPENAI_API_KEY
 * 
 * Stub mode:
 * If no API key is provided, the client will use stub mode with fake responses.
 */

import type { Role } from '../types';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const MODEL = 'gpt-4o-mini'; // Lightweight model for MVP

/**
 * Sends a chat request to OpenAI and returns the assistant's reply.
 * Falls back to stub mode if no API key is provided.
 */
export async function sendChat(
  messages: { role: Role; content: string }[]
): Promise<string> {
  // Stub mode: return fake response if no API key
  if (!API_KEY || API_KEY === '') {
    console.warn('⚠️ OpenAI API key not found. Using stub mode.');
    return generateStubResponse(messages);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`OpenAI API error: ${error.error?.message || JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated.';
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    // Fallback to stub on error
    return generateStubResponse(messages);
  }
}

/**
 * Generates a stub response for development/testing when API key is not available.
 */
function generateStubResponse(
  messages: { role: Role; content: string }[]
): string {
  const lastUserMessage = messages
    .slice()
    .reverse()
    .find(m => m.role === 'user')?.content || '';

  // Simple stub that acknowledges the user's message
  const responses = [
    `I understand you're asking about "${lastUserMessage.substring(0, 50)}...". This is a stub response. Please add your OpenAI API key to enable real AI responses.`,
    `Thanks for your message! In stub mode, I can't provide real AI responses. Add VITE_OPENAI_API_KEY to your .env file to enable the OpenAI integration.`,
    `I see you mentioned "${lastUserMessage.substring(0, 30)}...". This is a placeholder response. Configure your API key to get real AI assistance.`,
  ];

  // Deterministic but varied response based on message content
  const hash = lastUserMessage
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return responses[hash % responses.length];
}


