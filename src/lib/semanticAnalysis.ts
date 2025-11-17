import { Message, GraphEdge } from '../types';
import { generateEmbedding } from './embeddings';

// Simple entity extraction (can be replaced with NLP library like spaCy or similar)
export function extractEntities(text: string): string[] {
  // This is a simple regex-based entity extractor
  // In production, you'd want to use a proper NLP library
  const entities: string[] = [];
  
  // Extract potential named entities (capitalized words or phrases)
  const words = text.split(/\s+/);
  let currentEntity: string[] = [];
  
  for (const word of words) {
    const cleanWord = word.replace(/[^\w']/g, '');
    if (cleanWord.length > 2 && /^[A-Z]/.test(cleanWord)) {
      currentEntity.push(cleanWord);
    } else if (currentEntity.length > 0) {
      if (currentEntity.length > 1) {
        entities.push(currentEntity.join(' '));
      } else if (currentEntity[0].length > 3) {
        entities.push(currentEntity[0]);
      }
      currentEntity = [];
    }
  }
  
  return [...new Set(entities)]; // Remove duplicates
}

// Find related messages based on semantic similarity
export async function findRelatedMessages(
  currentMessage: string,
  messages: Message[],
  threshold = 0.7
): Promise<Message[]> {
  if (messages.length === 0) return [];
  
  const currentEmbedding = await generateEmbedding(currentMessage);
  const similarities: Array<{ message: Message; score: number }> = [];
  
  // This is a simplified version - in production, you'd use a vector database
  // like Pinecone, Weaviate, or similar for efficient similarity search
  for (const msg of messages) {
    if (!msg.metadata?.embedding) continue;
    
    const similarity = cosineSimilarity(currentEmbedding, msg.metadata.embedding);
    if (similarity > threshold) {
      similarities.push({ message: msg, score: similarity });
    }
  }
  
  return similarities.sort((a, b) => b.score - a.score).slice(0, 5).map(s => s.message); // Top 5 related messages
}

// Simple cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + (val * (b[i] || 0)), 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// Generate edges between related messages
export function generateEdgesFromContext(
  messageId: string,
  relatedMessages: Message[]
): GraphEdge[] {
  return relatedMessages.map(related => ({
    id: `${messageId}-${related.id}`,
    sourceId: messageId,
    targetId: related.id,
    type: 'similarity'
  }));
}

// Cluster messages into groups
export function clusterMessages(messages: Message[]): Map<string | number, string[]> {
  const clusters = new Map<string | number, string[]>();
  
  // Simple time-based clustering as a starting point
  // In production, you'd want to use a proper clustering algorithm
  // like k-means or HDBSCAN on the message embeddings
  let currentCluster: string[] = [];
  let lastTime = 0;
  let clusterId = 0;
  
  for (const msg of messages) {
    const msgTime = new Date(msg.createdAt).getTime();
    if (lastTime > 0 && (msgTime - lastTime) > 5 * 60 * 1000) { // 5 minute gap
      if (currentCluster.length > 0) {
        clusters.set(clusterId++, [...currentCluster]);
        currentCluster = [];
      }
    }
    currentCluster.push(msg.id);
    lastTime = msgTime;
  }
  
  if (currentCluster.length > 0) {
    clusters.set(clusterId, currentCluster);
  }
  
  return clusters;
}

// Add cluster information to nodes
export function addClusterInfoToNodes(
  nodes: Message[],
  clusters: Map<string | number, string[]>
): Message[] {
  return nodes.map(node => {
    for (const [clusterId, messageIds] of clusters.entries()) {
      if (messageIds.includes(node.id)) {
        return {
          ...node,
          cluster: clusterId,
          metadata: {
            ...node.metadata,
            cluster: String(clusterId)
          }
        };
      }
    }
    return node;
  });
}
