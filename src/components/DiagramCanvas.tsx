/**
 * DiagramCanvas Component
 * 
 * Renders a tldraw canvas with a diagram generated from a DiagramSpec.
 * Persists user edits and prevents re-rendering when navigating between diagrams.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Tldraw, Editor } from '@tldraw/tldraw';
import 'tldraw/tldraw.css';
import { applyDiagramToEditor } from '../lib/diagramConverter';
import type { DiagramSpec } from '../types/index';

interface DiagramCanvasProps {
  spec: DiagramSpec | null;
  messageId?: string; // Add messageId to identify which diagram this is
}

export function DiagramCanvas({ spec, messageId }: DiagramCanvasProps) {
  const editorRef = useRef<Editor | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const isRestoringRef = useRef(false);
  const isGeneratingRef = useRef(false);

  // Generate a unique key for this diagram's edits
  const getStorageKey = useCallback(() => {
    return `diagram_edits_${messageId}`;
  }, [messageId]);

  // Save current diagram state to localStorage
  const saveDiagramState = useCallback(() => {
    if (!editorRef.current || !messageId) return;
    
    try {
      const snapshot = editorRef.current.getSnapshot();
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(snapshot));
      console.log('Saved diagram state for message:', messageId);
    } catch (e) {
      console.error('Failed to save diagram state:', e);
    }
  }, [messageId, getStorageKey]);

  // Load saved diagram state from localStorage
  const loadDiagramState = useCallback(() => {
    if (!editorRef.current || !messageId) {
      console.log('Cannot load diagram state: editor or messageId missing');
      return false;
    }
    
    try {
      const storageKey = getStorageKey();
      const savedState = localStorage.getItem(storageKey);
      
      if (savedState) {
        console.log('Found saved state for message:', messageId, 'key:', storageKey);
        const snapshot = JSON.parse(savedState);
        isRestoringRef.current = true;
        editorRef.current.loadSnapshot(snapshot);
        // Add a small delay before allowing saves again to prevent immediate re-save
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
        console.log('Successfully restored diagram state for message:', messageId);
        return true;
      } else {
        console.log('No saved state found for message:', messageId, 'key:', storageKey);
      }
    } catch (e) {
      console.error('Failed to load diagram state for message:', messageId, e);
      isRestoringRef.current = false;
    }
    return false;
  }, [messageId, getStorageKey]);

  // Apply diagram when spec or messageId changes
  useEffect(() => {
    if (!editorRef.current || !editorReady || !spec || !messageId) return;
    
    // Always try to load saved edits first for this messageId
    if (loadDiagramState()) {
      console.log('Loaded saved edits for message:', messageId);
      return; // Successfully loaded saved edits
    }
    
    // No saved edits, generate fresh diagram
    console.log('No saved edits found, generating fresh diagram for spec:', spec.title);
    isGeneratingRef.current = true;
    applyDiagramToEditor(editorRef.current, spec)
      .then(() => {
        // Allow saves after a short delay to ensure diagram is fully rendered
        setTimeout(() => {
          isGeneratingRef.current = false;
        }, 500);
      })
      .catch(err => {
        console.error(err);
        isGeneratingRef.current = false;
      });
  }, [spec, messageId, editorReady]); // Removed loadDiagramState from deps to prevent unnecessary re-runs

  const handleMount = (editor: Editor) => {
    console.log('Tldraw mounted for messageId:', messageId);
    editorRef.current = editor;
    setEditorReady(true);
  };

  // Set up change listener after editor is ready
  useEffect(() => {
    if (!editorRef.current || !editorReady) return;

    const editor = editorRef.current;
    
    // Listen for changes to save state
    const handleChange = () => {
      if (!isRestoringRef.current && !isGeneratingRef.current) {
        saveDiagramState();
      }
    };

    editor.on('change', handleChange);

    // Cleanup
    return () => {
      editor.off('change', handleChange);
    };
  }, [editorReady, saveDiagramState]);

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
            // Clear saved edits and regenerate
            if (messageId) {
              const storageKey = getStorageKey();
              localStorage.removeItem(storageKey);
              // Clear the canvas and regenerate
              if (editorRef.current && spec) {
                editorRef.current.selectAll();
                editorRef.current.deleteShapes(editorRef.current.getSelectedShapeIds());
                applyDiagramToEditor(editorRef.current, spec).catch(console.error);
              }
            }
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
      
      <Tldraw key={messageId} onMount={handleMount} />
    </div>
  );
}
