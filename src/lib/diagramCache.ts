/**
 * In-memory diagram snapshot cache (per-session)
 * Keyed by `messageId`, stores tldraw editor snapshots to avoid
 * re-generating shapes when switching between history items.
 */

export const diagramSnapshotCache: Map<string, any> = new Map();
