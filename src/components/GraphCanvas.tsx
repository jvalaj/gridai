/**
 * GraphCanvas Component
 * 
 * Card-based graph visualization with draggable cards and connectors.
 * Matches the original card-based design.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SimulationNode, SimulationLink } from '../lib/graphEngine';
import type { Message } from '../types/index';

interface GraphCanvasProps {
  nodes: SimulationNode[];
  links: SimulationLink[];
  messages: Message[];
  onNodeClick: (messageId: string) => void;
  pinNode: (nodeId: string, x: number | null, y: number | null) => void;
}

interface CardPosition {
  id: string;
  x: number;
  y: number;
}

export function GraphCanvas({
  nodes,
  links,
  messages,
  onNodeClick,
  pinNode,
}: GraphCanvasProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const connectorsRef = useRef<SVGSVGElement>(null);
  
  // Center the view on the tree structure initially
  const [transform, setTransform] = useState(() => {
    // Center the viewport - will be adjusted when board loads
    if (typeof window !== 'undefined') {
      return { 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2 - 200, // Offset up to show root
        k: 1 
      };
    }
    return { x: 0, y: 0, k: 1 };
  });
  const [cardPositions, setCardPositions] = useState<Map<string, CardPosition>>(new Map());
  const [isPanning, setIsPanning] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; cardX: number; cardY: number } | null>(null);

  // Get message by node ID
  const getMessage = useCallback(
    (nodeId: string): Message | undefined => {
      return messages.find((m) => m.id === nodeId);
    },
    [messages]
  );

  // Track which cards have been manually positioned (dragged)
  const pinnedCardsRef = useRef<Set<string>>(new Set());
  
  // Update card positions from simulation nodes (only if not dragging and not pinned)
  useEffect(() => {
    if (draggingCardId) return; // Don't update positions while dragging
    
    const positions = new Map<string, CardPosition>();
    nodes.forEach((node) => {
      if (node.x !== undefined && node.y !== undefined) {
        const existing = cardPositions.get(node.id);
        const isPinned = pinnedCardsRef.current.has(node.id);
        
        // If card is pinned (was dragged), keep its position
        if (isPinned && existing) {
          positions.set(node.id, existing);
        } else if (existing && Math.abs(existing.x - node.x) < 5 && Math.abs(existing.y - node.y) < 5) {
          // Position hasn't changed much, keep existing
          positions.set(node.id, existing);
        } else {
          // Use simulation position for new/unpinned cards
          positions.set(node.id, {
            id: node.id,
            x: node.x,
            y: node.y,
          });
        }
      }
    });
    setCardPositions(positions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, draggingCardId]); // cardPositions is read but not in deps to avoid loops

  // Auto-zoom to fit tree as it grows
  useEffect(() => {
    if (!boardRef.current || cardPositions.size === 0 || isPanning || draggingCardId) return;
    
    // Small delay to let positions settle
    const timeoutId = setTimeout(() => {
      if (!boardRef.current) return;
      
      const board = boardRef.current;
      const boardRect = board.getBoundingClientRect();
      const boardWidth = boardRect.width;
      const boardHeight = boardRect.height;
      
      // Calculate bounding box of all cards
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      cardPositions.forEach((pos) => {
        const cardWidth = 300;
        const cardHeight = 200; // Approximate card height
        
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x + cardWidth);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y + cardHeight);
      });
      
      // Only proceed if we have valid bounds
      if (minX === Infinity || maxX === -Infinity) return;
      
      const treeWidth = maxX - minX;
      const treeHeight = maxY - minY;
      const treeCenterX = (minX + maxX) / 2;
      const treeCenterY = (minY + maxY) / 2;
      
      // Calculate zoom to fit tree with padding
      const padding = 120;
      const scaleX = (boardWidth - padding * 2) / treeWidth;
      const scaleY = (boardHeight - padding * 2) / treeHeight;
      const newScale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x
      
      // Clamp zoom between 0.25 and 1.0
      const clampedScale = Math.max(0.25, Math.min(1.0, newScale));
      
      // Only update if the scale changed significantly (avoid jitter)
      if (Math.abs(transform.k - clampedScale) > 0.03) {
        // Calculate new transform to center the tree
        const newX = boardWidth / 2 - treeCenterX * clampedScale;
        const newY = boardHeight / 2 - treeCenterY * clampedScale;
        
        setTransform({
          x: newX,
          y: newY,
          k: clampedScale,
        });
      }
    }, 300); // Wait 300ms for positions to settle
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardPositions.size, nodes.length]); // Update when tree size changes

  // Update SVG connectors
  const updateConnectors = useCallback(() => {
    if (!connectorsRef.current) return;
    
    const svg = connectorsRef.current;
    svg.innerHTML = '';

    // Group links by node pairs to detect bidirectional connections
    const linkPairs = new Map<string, Array<{ link: SimulationLink; index: number }>>();
    
    links.forEach((link, index) => {
      const source = link.source as SimulationNode;
      const target = link.target as SimulationNode;
      
      // Create a consistent key for the node pair (sorted to group bidirectional links)
      const pairKey = [source.id, target.id].sort().join('->');
      
      if (!linkPairs.has(pairKey)) {
        linkPairs.set(pairKey, []);
      }
      linkPairs.get(pairKey)!.push({ link, index });
    });

    let linesDrawn = 0;
    
    linkPairs.forEach((pairLinks) => {
      // Determine if we have multiple links between the same nodes
      const hasMultipleLinks = pairLinks.length > 1;
      
      pairLinks.forEach(({ link }, linkIndex) => {
        const source = link.source as SimulationNode;
        const target = link.target as SimulationNode;
        const sourcePos = cardPositions.get(source.id);
        const targetPos = cardPositions.get(target.id);
        
        if (!sourcePos || !targetPos) {
          return;
        }
        
        linesDrawn++;

        // Calculate connection points at card borders
        const cardWidth = 300;
        const cardHeaderHeight = 50;
        const cardBorderRadius = 8; // Match the rounded corners
        
        // Get actual card height from message content
        const sourceMessage = getMessage(source.id);
        const targetMessage = getMessage(target.id);
        const sourceContentHeight = sourceMessage ? Math.max(80, (sourceMessage.content.length / 50) * 20) : 100;
        const targetContentHeight = targetMessage ? Math.max(80, (targetMessage.content.length / 50) * 20) : 100;
        
        const sourceCardHeight = cardHeaderHeight + sourceContentHeight;
        const targetCardHeight = cardHeaderHeight + targetContentHeight;
        
        // Calculate card centers
        const sourceCenterX = sourcePos.x + cardWidth / 2;
        const sourceCenterY = sourcePos.y + sourceCardHeight / 2;
        const targetCenterX = targetPos.x + cardWidth / 2;
        const targetCenterY = targetPos.y + targetCardHeight / 2;
        
        // Calculate direction from source center to target center
        const dx = targetCenterX - sourceCenterX;
        const dy = targetCenterY - sourceCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return; // Skip if cards are at same position
        
        // Normalize direction
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Function to find intersection point with rectangle border
        const getRectBorderIntersection = (
          centerX: number,
          centerY: number,
          rectX: number,
          rectY: number,
          rectWidth: number,
          rectHeight: number,
          dirX: number,
          dirY: number
        ): [number, number] => {
          // Calculate which edge the line intersects
          const halfWidth = rectWidth / 2;
          const halfHeight = rectHeight / 2;
          
          // Check intersection with each edge
          let intersectX = centerX;
          let intersectY = centerY;
          
          if (Math.abs(dirX) > Math.abs(dirY)) {
            // More horizontal - will hit left or right edge
            if (dirX > 0) {
              // Right edge
              intersectX = rectX + rectWidth;
              intersectY = centerY + (intersectX - centerX) * (dirY / dirX);
            } else {
              // Left edge
              intersectX = rectX;
              intersectY = centerY + (intersectX - centerX) * (dirY / dirX);
            }
          } else {
            // More vertical - will hit top or bottom edge
            if (dirY > 0) {
              // Bottom edge
              intersectY = rectY + rectHeight;
              intersectX = centerX + (intersectY - centerY) * (dirX / dirY);
            } else {
              // Top edge
              intersectY = rectY;
              intersectX = centerX + (intersectY - centerY) * (dirX / dirY);
            }
          }
          
          return [intersectX, intersectY];
        };
        
        // Get intersection points at card borders
        const [sourceX, sourceY] = getRectBorderIntersection(
          sourceCenterX,
          sourceCenterY,
          sourcePos.x,
          sourcePos.y,
          cardWidth,
          sourceCardHeight,
          dirX,
          dirY
        );
        
        const [targetX, targetY] = getRectBorderIntersection(
          targetCenterX,
          targetCenterY,
          targetPos.x,
          targetPos.y,
          cardWidth,
          targetCardHeight,
          -dirX, // Opposite direction for target
          -dirY
        );
        
        const isSimilarity = link.type === 'similarity';
        
        // Determine if this link should be curved
        const shouldCurve = hasMultipleLinks || isSimilarity;
        
        if (shouldCurve) {
          // Use curved path (cubic bezier for smoother, more visible curves)
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          
          // Calculate control points for cubic bezier
          const dx = targetX - sourceX;
          const dy = targetY - sourceY;
          const length = Math.sqrt(dx * dx + dy * dy);
          
          if (length > 0) {
            // Offset for curve (larger for more visible curve)
            const curveOffset = hasMultipleLinks ? (linkIndex === 0 ? 120 : -120) : 80;
            
            // Calculate perpendicular offset
            const perpX = -dy / length;
            const perpY = dx / length;
            
            // Two control points for cubic bezier (creates smoother, more visible S-curve)
            const controlDist = length * 0.4; // Control points at 40% of distance
            
            const control1X = sourceX + dx * 0.25 + perpX * curveOffset;
            const control1Y = sourceY + dy * 0.25 + perpY * curveOffset;
            const control2X = sourceX + dx * 0.75 + perpX * curveOffset;
            const control2Y = sourceY + dy * 0.75 + perpY * curveOffset;
            
            // Create smooth cubic bezier curve
            const pathData = `M ${sourceX} ${sourceY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${targetX} ${targetY}`;
            path.setAttribute('d', pathData);
            path.setAttribute('class', 'connector-line');
            path.setAttribute('stroke-width', '2');
            if (isSimilarity) {
              path.setAttribute('stroke-dasharray', '5,5');
              path.style.opacity = '0.4';
            }
            
            svg.appendChild(path);

            // Endpoint nodes (small circles)
            const sCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            sCircle.setAttribute('cx', String(sourceX));
            sCircle.setAttribute('cy', String(sourceY));
            sCircle.setAttribute('r', '2');
            sCircle.setAttribute('class', 'connector-node');
            if (isSimilarity) sCircle.style.opacity = '0.7';
            svg.appendChild(sCircle);

            const tCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            tCircle.setAttribute('cx', String(targetX));
            tCircle.setAttribute('cy', String(targetY));
            tCircle.setAttribute('r', '2');
            tCircle.setAttribute('class', 'connector-node');
            if (isSimilarity) tCircle.style.opacity = '0.7';
            svg.appendChild(tCircle);
            
            // Add arrowhead for curved paths - calculate angle from last control point
            const arrowSize = 10;
            const angle = Math.atan2(targetY - control2Y, targetX - control2X);
            
            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const arrowPoints = [
              [targetX, targetY],
              [targetX - arrowSize * Math.cos(angle - Math.PI / 6), targetY - arrowSize * Math.sin(angle - Math.PI / 6)],
              [targetX - arrowSize * Math.cos(angle + Math.PI / 6), targetY - arrowSize * Math.sin(angle + Math.PI / 6)]
            ];
            arrow.setAttribute('points', arrowPoints.map(p => p.join(',')).join(' '));
            arrow.setAttribute('class', 'connector-line');
            if (isSimilarity) {
              arrow.style.opacity = '0.4';
            }
            svg.appendChild(arrow);
          }
        } else {
          // Use straight line for single chronological links
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', String(sourceX));
          line.setAttribute('y1', String(sourceY));
          line.setAttribute('x2', String(targetX));
          line.setAttribute('y2', String(targetY));
          line.setAttribute('class', 'connector-line');
          line.setAttribute('stroke-width', '2');
          
          svg.appendChild(line);

          // Endpoint nodes (small circles)
          const sCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          sCircle.setAttribute('cx', String(sourceX));
          sCircle.setAttribute('cy', String(sourceY));
          sCircle.setAttribute('r', '2');
          sCircle.setAttribute('class', 'connector-node');
          svg.appendChild(sCircle);

          const tCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          tCircle.setAttribute('cx', String(targetX));
          tCircle.setAttribute('cy', String(targetY));
          tCircle.setAttribute('r', '2');
          tCircle.setAttribute('class', 'connector-node');
          svg.appendChild(tCircle);
          
          // Add arrowhead
          const arrowSize = 10;
          const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
          
          const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          const arrowPoints = [
            [targetX, targetY],
            [targetX - arrowSize * Math.cos(angle - Math.PI / 6), targetY - arrowSize * Math.sin(angle - Math.PI / 6)],
            [targetX - arrowSize * Math.cos(angle + Math.PI / 6), targetY - arrowSize * Math.sin(angle + Math.PI / 6)]
          ];
          arrow.setAttribute('points', arrowPoints.map(p => p.join(',')).join(' '));
          arrow.setAttribute('class', 'connector-line');
          svg.appendChild(arrow);
        }
      });
    });
    
    if (linesDrawn > 0) {
      console.log(`✅ Drew ${linesDrawn} connector lines`);
    }
  }, [links, cardPositions, getMessage]);

  // Update transform on cards and connectors with smooth transitions
  useEffect(() => {
    if (cardsContainerRef.current && connectorsRef.current) {
      // Add smooth transition for zoom (but not for panning/dragging)
      if (!isPanning && !draggingCardId) {
        cardsContainerRef.current.style.transition = 'transform 0.2s ease-out';
        connectorsRef.current.style.transition = 'transform 0.2s ease-out';
      } else {
        cardsContainerRef.current.style.transition = 'none';
        connectorsRef.current.style.transition = 'none';
      }
      
      // Cards container and SVG connectors use the same transform
      const transformStr = `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`;
      cardsContainerRef.current.style.transform = transformStr;
      connectorsRef.current.style.transform = transformStr;
    }
  }, [transform, isPanning, draggingCardId]);

  // Update connectors when positions or links change
  useEffect(() => {
    // Small delay to ensure card positions are set
    const timeoutId = setTimeout(() => {
      updateConnectors();
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [cardPositions, links, updateConnectors]);

  // Handle mouse wheel zoom - simpler and more responsive
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const handleWheel = (e: WheelEvent) => {
      // Always zoom on wheel, no modifiers needed (standard behavior for graph tools)
      e.preventDefault();
      
      const rect = board.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Determine zoom direction and amount
      // deltaY positive = scroll down = zoom out
      // deltaY negative = scroll up = zoom in
      const zoomIntensity = 0.1;
      const wheel = e.deltaY < 0 ? 1 : -1;
      const zoom = Math.exp(wheel * zoomIntensity);
      
      const newK = Math.max(0.1, Math.min(3, transform.k * zoom));
      
      // Zoom towards mouse cursor
      const worldX = (mouseX - transform.x) / transform.k;
      const worldY = (mouseY - transform.y) / transform.k;
      
      const newX = mouseX - worldX * newK;
      const newY = mouseY - worldY * newK;

      setTransform({
        x: newX,
        y: newY,
        k: newK,
      });
    };

    board.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      board.removeEventListener('wheel', handleWheel);
    };
  }, [transform]);

  // Handle keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const newK = Math.min(3, transform.k * 1.3);
        setTransform({ ...transform, k: newK });
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const newK = Math.max(0.1, transform.k / 1.3);
        setTransform({ ...transform, k: newK });
      } else if (e.key === '0') {
        e.preventDefault();
        setTransform({
          x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
          y: typeof window !== 'undefined' ? window.innerHeight / 2 - 200 : 0,
          k: 1,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transform]);

  // Handle board panning
  const handleBoardMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === boardRef.current || e.target === cardsContainerRef.current || e.target === connectorsRef.current) {
      if (e.button === 0) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
        if (boardRef.current) {
          boardRef.current.classList.add('panning');
        }
      }
    }
  }, [transform]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning && panStartRef.current) {
      setTransform({
        ...transform,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    } else if (draggingCardId && dragStartRef.current) {
      const deltaX = (e.clientX - dragStartRef.current.x) / transform.k;
      const deltaY = (e.clientY - dragStartRef.current.y) / transform.k;
      const newX = dragStartRef.current.cardX + deltaX;
      const newY = dragStartRef.current.cardY + deltaY;
      
      const newPositions = new Map(cardPositions);
      newPositions.set(draggingCardId, { 
        id: draggingCardId, 
        x: newX, 
        y: newY 
      });
      setCardPositions(newPositions);
      
      // Update the pin position in real-time as we drag
      pinNode(draggingCardId, newX, newY);
    }
  }, [isPanning, draggingCardId, transform, cardPositions, pinNode]);

  const handleMouseUp = useCallback(() => {
    // Unpin the card when dragging ends (keep it in its new position)
    if (draggingCardId) {
      const cardPos = cardPositions.get(draggingCardId);
      if (cardPos) {
        // Keep it pinned at the new position
        pinNode(draggingCardId, cardPos.x, cardPos.y);
      }
    }
    
    setIsPanning(false);
    setDraggingCardId(null);
    panStartRef.current = null;
    dragStartRef.current = null;
    if (boardRef.current) {
      boardRef.current.classList.remove('panning');
    }
  }, [draggingCardId, cardPositions, pinNode]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Handle card drag start - pin the card when dragging starts
  const handleCardMouseDown = useCallback((e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    const cardPos = cardPositions.get(cardId);
    if (cardPos) {
      setDraggingCardId(cardId);
      // Mark as pinned and pin in force simulation
      pinnedCardsRef.current.add(cardId);
      pinNode(cardId, cardPos.x, cardPos.y);
      dragStartRef.current = { 
        x: e.clientX, 
        y: e.clientY,
        cardX: cardPos.x,
        cardY: cardPos.y,
      };
    }
  }, [cardPositions, pinNode]);

  // Zoom controls - must be before early return
  const handleZoomIn = useCallback(() => {
    const newK = Math.min(3, transform.k * 1.3);
    setTransform({ ...transform, k: newK });
  }, [transform]);

  const handleZoomOut = useCallback(() => {
    const newK = Math.max(0.1, transform.k / 1.3);
    setTransform({ ...transform, k: newK });
  }, [transform]);

  const handleResetView = useCallback(() => {
    setTransform({
      x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
      y: typeof window !== 'undefined' ? window.innerHeight / 2 - 200 : 0,
      k: 1,
    });
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p className="text-sm">Your conversation graph will appear here</p>
      </div>
    );
  }

  return (
    <div
      ref={boardRef}
      className="relative w-full h-full bg-white cursor-grab overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle, #e5e5e5 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0',
      }}
      onMouseDown={handleBoardMouseDown}
    >
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all flex items-center justify-center"
          title="Zoom In"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all flex items-center justify-center"
          title="Zoom Out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleResetView}
          className="w-10 h-10 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all flex items-center justify-center"
          title="Reset View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center text-xs font-medium">
          {Math.round(transform.k * 100)}%
        </div>
      </div>

      {/* SVG Connectors */}
      <svg
        ref={connectorsRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ 
          width: '10000px', 
          height: '10000px', 
          overflow: 'visible',
          zIndex: 10
        }}
      />

      {/* Cards Container */}
      <div
        ref={cardsContainerRef}
        className="absolute top-0 left-0 w-full h-full"
        style={{ zIndex: 20 }}
      >
        {nodes.map((node) => {
          if (node.x === undefined || node.y === undefined) return null;

          const message = getMessage(node.id);
          if (!message) return null;

          const pos = cardPositions.get(node.id) ?? { id: node.id, x: node.x, y: node.y };
          const isUser = message.role === 'user';

          return (
              <div
                key={node.id}
                className={`absolute card ${draggingCardId === node.id ? 'dragging' : ''}`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: '300px',
                }}
              >
              {/* Card Header */}
              <div
                className="card-header cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => handleCardMouseDown(e, node.id)}
              >
                <span className={`card-type ${isUser ? 'user' : 'ai'}`}>
                  {isUser ? 'User' : 'Assistant'}
                </span>
              </div>

              {/* Card Body */}
              <div className="card-body" onClick={() => onNodeClick(node.id)}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                  {message.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
