/**
 * Response Splitter
 * 
 * Splits ChatGPT responses into multiple cards for better visualization.
 * Similar to Obsidian's note-taking approach where ideas are split into separate nodes.
 */

import type { Message } from '../types';

/**
 * Splits a response into multiple message chunks.
 * Uses paragraph breaks, numbered lists, and section markers.
 */
export function splitResponse(response: string, parentMessageId: string): Message[] {
  const chunks: Message[] = [];
  
  // Split by double newlines (paragraphs)
  const paragraphs = response.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  // If response is short, don't split
  if (response.length < 200 && paragraphs.length <= 1) {
    return [];
  }
  
  // Split into meaningful chunks
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    
    // Check if this looks like a new section (numbered list, heading, etc.)
    const isNewSection = 
      /^\d+[\.\)]\s/.test(trimmed) || // Numbered list
      /^[#-]+\s/.test(trimmed) || // Markdown heading
      /^[A-Z][^.!?]*:/.test(trimmed) || // Section header (e.g., "Introduction:")
      trimmed.length > 300; // Long paragraph
    
    if (isNewSection && currentChunk.length > 50) {
      // Save current chunk
      if (currentChunk.trim()) {
        chunks.push({
          id: `${parentMessageId}-chunk-${chunkIndex}`,
          role: 'assistant',
          content: currentChunk.trim(),
          createdAt: new Date().toISOString(),
        });
        chunkIndex++;
      }
      currentChunk = trimmed;
    } else {
      // Add to current chunk
      if (currentChunk) {
        currentChunk += '\n\n' + trimmed;
      } else {
        currentChunk = trimmed;
      }
    }
    
    // If chunk gets too long, split it
    if (currentChunk.length > 500) {
      chunks.push({
        id: `${parentMessageId}-chunk-${chunkIndex}`,
        role: 'assistant',
        content: currentChunk.trim(),
        createdAt: new Date().toISOString(),
      });
      chunkIndex++;
      currentChunk = '';
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push({
      id: `${parentMessageId}-chunk-${chunkIndex}`,
      role: 'assistant',
      content: currentChunk.trim(),
      createdAt: new Date().toISOString(),
    });
  }
  
  return chunks;
}

