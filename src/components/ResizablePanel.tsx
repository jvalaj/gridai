/**
 * ResizablePanel Component
 * 
 * Provides draggable resize handles for vertical and horizontal splits.
 */

import { useState, useRef, useEffect } from 'react';

interface ResizablePanelProps {
  direction: 'horizontal' | 'vertical';
  initialSize: number;
  minSize?: number;
  maxSize?: number;
  children: [React.ReactNode, React.ReactNode];
}

export function ResizablePanel({
  direction,
  initialSize,
  minSize = 200,
  maxSize = Infinity,
  children,
}: ResizablePanelProps) {
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let newSize: number;

      if (direction === 'horizontal') {
        newSize = e.clientX - rect.left;
      } else {
        newSize = e.clientY - rect.top;
      }

      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, minSize, maxSize]);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} h-full w-full`}
    >
      {/* First panel */}
      <div
        style={{
          [isHorizontal ? 'width' : 'height']: `${size}px`,
          flexShrink: 0,
        }}
        className="overflow-hidden"
      >
        {children[0]}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          group relative z-10 shrink-0
          ${isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
          ${isDragging ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}
          transition-colors
        `}
      >
        {/* Larger hit area for easier grabbing */}
        <div
          className={`
            absolute inset-0
            ${isHorizontal ? 'w-1 -left-1' : 'h-3 -top-1'}
          `}
        />
      </div>

      {/* Second panel */}
      <div className="flex-1 overflow-hidden min-w-0 min-h-0">
        {children[1]}
      </div>
    </div>
  );
}
