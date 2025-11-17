// In a production app, you would use a real embeddings API like OpenAI's
// For now, we'll use a simple TF-IDF like approach for demonstration

const wordFreq = (str: string): Record<string, number> => {
  const words = str.toLowerCase().split(/\s+/);
  return words.reduce((freq: Record<string, number>, word) => {
    const cleanWord = word.replace(/[^\w']/g, '');
    if (cleanWord.length > 2) { // Only include words longer than 2 chars
      freq[cleanWord] = (freq[cleanWord] || 0) + 1;
    }
    return freq;
  }, {});
};

export async function generateEmbedding(text: string): Promise<number[]> {
  // In a real app, you would call an embeddings API here
  // This is a simple placeholder that creates a "bag of words" vector
  const freq = wordFreq(text);
  const words = Object.keys(freq);
  
  // Create a simple binary vector (1 if word exists, 0 otherwise)
  // In a real app, this would be a high-dimensional vector from an embeddings model
  return words.map(word => freq[word] > 0 ? 1 : 0);
}

// Simple similarity function for our fake embeddings
export function vectorSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dot = 0;
  let magA = 0;
  let magB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}
