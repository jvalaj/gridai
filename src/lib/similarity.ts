/**
 * Similarity Computation
 * 
 * This module handles computing similarity between messages for generating
 * semantic similarity edges in the graph.
 * 
 * TODO: Replace with real embeddings from OpenAI's embeddings API
 * - Use text-embedding-3-small or text-embedding-ada-002
 * - Compute cosine similarity between embeddings
 * - Only create edges above a similarity threshold (e.g., 0.7)
 */

import type { Message } from '../types';

/**
 * Stub function that computes a fake embedding vector for a message.
 * Currently uses a simple hash-based approach to generate deterministic vectors.
 * 
 * TODO: Replace with real OpenAI embeddings API call
 */
export function computeMessageVector(message: Message): number[] {
  // Simple hash-based vector generation (deterministic but not semantic)
  const text = message.content.toLowerCase();
  const vector: number[] = [];
  
  // Generate a 128-dimensional vector (typical embedding size)
  for (let i = 0; i < 128; i++) {
    let hash = 0;
    for (let j = 0; j < text.length; j++) {
      hash = ((hash << 5) - hash + text.charCodeAt(j) + i) | 0;
    }
    // Normalize to [-1, 1]
    vector.push(Math.sin(hash) * 0.5);
  }
  
  return vector;
}

/**
 * Computes cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Finds similar messages to the given message.
 * Returns up to maxSimilar messages with similarity above the threshold.
 * 
 * TODO: Replace with real embedding-based similarity
 */
export function findSimilarMessages(
  message: Message,
  allMessages: Message[],
  threshold: number = 0.3, // Lower threshold for stub mode
  maxSimilar: number = 3
): Message[] {
  const messageVector = computeMessageVector(message);
  const similarities: Array<{ message: Message; score: number }> = [];
  
  for (const other of allMessages) {
    if (other.id === message.id) continue;
    
    const otherVector = computeMessageVector(other);
    const similarity = cosineSimilarity(messageVector, otherVector);
    
    if (similarity > threshold) {
      similarities.push({ message: other, score: similarity });
    }
  }
  
  // Sort by similarity and return top matches
  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSimilar)
    .map(item => item.message);
}


