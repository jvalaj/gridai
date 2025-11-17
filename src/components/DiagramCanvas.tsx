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
      applyDiagramToEditor(editorRef.current, spec).catch(console.error);
    }
  }, [spec]);

  const handleMount = (editor: Editor) => {
    editorRef.current = editor;
    if (spec) {
      applyDiagramToEditor(editor, spec).catch(console.error);
    }
  };

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
      <Tldraw onMount={handleMount} />
    </div>
  );
}
