/**
 * diagramStorage
 * Persist tldraw snapshots to localStorage with a schema + spec signature.
 */

import type { DiagramSpec } from '../types';

const SNAPSHOT_VERSION = 1;

function storageKey(messageId: string) {
  return `diagram_snapshot_${messageId}`;
}

// Produce a stable signature for a diagram spec to avoid loading mismatched snapshots
export function specSignature(spec: DiagramSpec): string {
  const nodes = [...spec.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const edges = [...spec.edges].sort((a, b) =>
    a.from === b.from ? (a.to === b.to ? (a.label || '').localeCompare(b.label || '') : a.to.localeCompare(b.to)) : a.from.localeCompare(b.from)
  );
  const payload = JSON.stringify({ type: spec.type, title: spec.title, nodes, edges });
  // Simple djb2 hash for compactness
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash) + payload.charCodeAt(i);
    hash = hash >>> 0; // force uint32
  }
  return `v${SNAPSHOT_VERSION}_${hash.toString(16)}`;
}

export function saveSnapshot(messageId: string, spec: DiagramSpec, snapshot: any) {
  try {
    const data = {
      version: SNAPSHOT_VERSION,
      sig: specSignature(spec),
      snapshot,
      savedAt: Date.now(),
    };
    localStorage.setItem(storageKey(messageId), JSON.stringify(data));
  } catch (e) {
    // Ignore storage errors (quota, privacy, etc.)
    console.warn('Failed to save snapshot', e);
  }
}

export function loadSnapshot(messageId: string, spec: DiagramSpec): any | null {
  try {
    const raw = localStorage.getItem(storageKey(messageId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    if (data.version !== SNAPSHOT_VERSION) return null;
    const currentSig = specSignature(spec);
    if (data.sig !== currentSig) return null;
    return data.snapshot || null;
  } catch (e) {
    return null;
  }
}

export function clearSnapshot(messageId: string) {
  try {
    localStorage.removeItem(storageKey(messageId));
  } catch {}
}
