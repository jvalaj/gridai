/**
 * DiagramCanvas Component
 * 
 * Renders a tldraw canvas with a diagram generated from a DiagramSpec.
 */

import { useEffect, useRef } from 'react';
import { Tldraw, Editor } from '@tldraw/tldraw';
import 'tldraw/tldraw.css';
import { applyDiagramToEditor } from '../lib/diagramConverter';
import type { DiagramSpec } from '../types/index';

interface DiagramCanvasProps {
  spec: DiagramSpec | null;
}

export function DiagramCanvas({ spec }: DiagramCanvasProps) {
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    if (editorRef.current && spec) {
      applyDiagramToEditor(editorRef.current, spec);
    }
  }, [spec]);

  const handleMount = (editor: Editor) => {
    editorRef.current = editor;
    if (spec) {
      applyDiagramToEditor(editor, spec);
    }
  };

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Diagram Yet</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Ask a technical question like "Explain how OAuth2 works" or "Show me a microservices
            architecture" to see a diagram.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-4 left-4 z-10 bg-white px-4 py-2 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">{spec.title}</h3>
        <p className="text-xs text-gray-500 capitalize">{spec.type.replace('-', ' ')}</p>
      </div>
      <Tldraw onMount={handleMount} />
    </div>
  );
}
