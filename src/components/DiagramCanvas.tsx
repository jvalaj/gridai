/**
 * DiagramCanvas Component
 * 
 * Renders a tldraw canvas with a diagram generated from a DiagramSpec.
 * Simplified: no localStorage persistence, always re-applies the selected diagram.
 */

import { useEffect, useRef, useState } from 'react';
import { Tldraw, Editor } from '@tldraw/tldraw';
import 'tldraw/tldraw.css';
import { applyDiagramToEditor } from '../lib/diagramConverter';
import type { DiagramSpec } from '../types/index';
import { diagramSnapshotCache } from '../lib/diagramCache';
import { loadSnapshot as loadStoredSnapshot, saveSnapshot as saveStoredSnapshot, clearSnapshot as clearStoredSnapshot } from '../lib/diagramStorage';

interface DiagramCanvasProps {
  spec: DiagramSpec | null;
  messageId?: string; // Add messageId to identify which diagram this is
  prompt?: string;
}

export function DiagramCanvas({ spec, messageId, prompt }: DiagramCanvasProps) {
  const editorRef = useRef<Editor | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const isRestoringRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  // Apply diagram when spec or messageId changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !editorReady || !spec || !messageId) return;

    const cached = diagramSnapshotCache.get(messageId);
    if (cached) {
      // Load from cache without regenerating shapes
      try {
        isRestoringRef.current = true;
        editor.loadSnapshot(cached);
      } finally {
        // small timeout to avoid immediate re-save churn
        setTimeout(() => (isRestoringRef.current = false), 50);
      }
      return;
    }

    // Try persistent storage next (only if cache miss)
    const stored = loadStoredSnapshot(messageId, spec);
    if (stored) {
      try {
        isRestoringRef.current = true;
        editor.loadSnapshot(stored);
        // hydrate memory cache
        diagramSnapshotCache.set(messageId, stored);
      } finally {
        setTimeout(() => (isRestoringRef.current = false), 50);
      }
      return;
    }

    // No cache: generate from spec, then cache a snapshot
    applyDiagramToEditor(editor, spec, prompt)
      .then(() => {
        try {
          const snap = editor.getSnapshot();
          diagramSnapshotCache.set(messageId, snap);
          saveStoredSnapshot(messageId, spec, snap);
        } catch (e) {
          console.error('Failed to cache snapshot:', e);
        }
      })
      .catch(console.error);
  }, [spec, messageId, editorReady]);

  const handleMount = (editor: Editor) => {
    console.log('Tldraw mounted for messageId:', messageId);
    editorRef.current = editor;
    setEditorReady(true);
  };

  // Keep cache updated with user edits for the current messageId
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !editorReady || !messageId) return;

    const onChange = () => {
      if (isRestoringRef.current) return;
      try {
        const snap = editor.getSnapshot();
        diagramSnapshotCache.set(messageId, snap);
        // Debounce persistent saves to reduce churn
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
          if (spec && messageId) {
            saveStoredSnapshot(messageId, spec, snap);
          }
        }, 250);
      } catch (e) {
        // ignore
      }
    };

    editor.on('change', onChange);
    return () => {
      editor.off('change', onChange);
    };
  }, [editorReady, messageId]);

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center px-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-blue-50 flex items-center justify-center shadow-lg shadow-blue-200/50">
            <svg
              className="w-10 h-10 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">No Diagram Yet</h3>
          <p className="text-[15px] text-gray-600 max-w-sm leading-relaxed">
            Ask a technical question like "Explain how OAuth2 works" or "Show me a microservices
            architecture" to see a diagram.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-6 left-6 z-10 bg-black/70 backdrop-blur-lg px-5 py-3 rounded-xl shadow-lg border border-white/10">
        <h3 className="text-[15px] font-semibold text-white">{spec.title}</h3>
        <p className="text-xs text-white/60 capitalize font-medium mt-0.5">{spec.type.replace('-', ' ')}</p>
      </div>
      
      {/* Control Buttons */}
      <div className="absolute top-6 right-6 z-10 flex gap-2">
        <button 
          onClick={() => {
            // Clear cache for this diagram and regenerate from spec
            if (!spec) return;
            if (messageId) diagramSnapshotCache.delete(messageId);
            if (messageId) clearStoredSnapshot(messageId);
            const editor = editorRef.current;
            if (!editor) return;
            editor.selectAll();
            editor.deleteShapes(editor.getSelectedShapeIds());
            applyDiagramToEditor(editor, spec, prompt)
              .then(() => {
                try {
                  const snap = editor.getSnapshot();
                  if (messageId) diagramSnapshotCache.set(messageId, snap);
                  if (messageId) saveStoredSnapshot(messageId, spec, snap);
                } catch {}
              })
              .catch(console.error);
          }}
          className="bg-black/70 backdrop-blur-lg px-3 py-2 rounded-lg text-white text-sm hover:bg-black/80 transition-colors"
          title="Reset to original diagram"
        >
          Reset
        </button>
      </div>
      
      {/* Zoom Controls */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
        <button 
          onClick={() => editorRef.current?.zoomIn()}
          className="bg-black/70 backdrop-blur-lg p-2 rounded-lg text-white hover:bg-black/80 transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button 
          onClick={() => editorRef.current?.zoomOut()}
          className="bg-black/70 backdrop-blur-lg p-2 rounded-lg text-white hover:bg-black/80 transition-colors"
          title="Zoom Out"
        >
          −
        </button>
        <button 
          onClick={() => editorRef.current?.zoomToFit()}
          className="bg-black/70 backdrop-blur-lg px-2 py-1 rounded-lg text-white text-xs hover:bg-black/80 transition-colors"
          title="Fit to Screen"
        >
          Fit
        </button>
      </div>
      
      {/* Keep a single editor instance; we load snapshots when switching */}
      <Tldraw onMount={handleMount} />
    </div>
  );
}
