/**
 * Diagram Converter
 * 
 * Converts DiagramSpec JSON to tldraw shapes and arranges them automatically.
 */

import { createShapeId, Editor } from '@tldraw/tldraw';
import type { DiagramSpec, DiagramNode, DiagramEdge } from '../types/index';

interface LayoutPosition {
  x: number;
  y: number;
}

/**
 * Applies a DiagramSpec to a tldraw editor instance
 */
export function applyDiagramToEditor(editor: Editor, spec: DiagramSpec) {
  console.log('Applying diagram to editor:', spec);
  
  // Clear existing shapes
  editor.selectAll();
  editor.deleteShapes(editor.getSelectedShapeIds());

  const nodePositions = calculateLayout(spec);
  const shapeIds = new Map<string, string>();

  // Create node shapes with visual variety based on type
  spec.nodes.forEach((node: DiagramNode) => {
    const pos = nodePositions.get(node.id);
    if (!pos) return;

    const color = getColorForKind(node.kind);
    const geoShape = getShapeForKind(node.kind);
    const shapeId = createShapeId();
    shapeIds.set(node.id, shapeId);

    const icon = getIconForKind(node.kind);
    const labelText = `${icon} ${node.label}`;
    
    // Add natural variations
    const sizeVariation = getRandomVariation();
    const fillStyle = getRandomFill();
    const dashStyle = getRandomDash();
    const rotation = getRandomRotation();
    
    console.log('Creating shape:', { id: node.id, label: labelText, geo: geoShape, pos });

    // Create visually distinct geo shapes with integrated label
    editor.createShape({
      type: 'geo',
      id: shapeId,
      x: pos.x,
      y: pos.y,
      rotation: rotation,
      props: {
        w: Math.max(200, 200 + sizeVariation * 0.5),
        h: Math.max(120, 120 + sizeVariation * 0.3),
        geo: geoShape,
        color: color,
        fill: fillStyle,
        dash: dashStyle,
        size: 'm',
        richText: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: labelText
                }
              ]
            }
          ]
        },
        align: 'middle',
        verticalAlign: 'middle',
        labelColor: 'black',
        font: 'sans',
      },
    });
  });

  // Create edge shapes (arrows) with visual variety
  spec.edges.forEach((edge: DiagramEdge) => {
    const fromShapeId = shapeIds.get(edge.from);
    const toShapeId = shapeIds.get(edge.to);
    const fromPos = nodePositions.get(edge.from);
    const toPos = nodePositions.get(edge.to);
    
    if (!fromShapeId || !toShapeId || !fromPos || !toPos) return;

    // Calculate center points of shapes for arrow placement
    const startX = fromPos.x + 100; // Center of shape (w=200, so w/2=100)
    const startY = fromPos.y + 60;  // Center of shape (h=120, so h/2=60)
    const endX = toPos.x + 100;
    const endY = toPos.y + 60;

    // Create styled arrows between shapes with integrated label
    const arrowId = createShapeId();
    const arrowDash = getRandomArrowDash();
    const arrowColor = getRandomArrowColor();
    const arrowSize = getRandomArrowSize();
    
    editor.createShape({
      type: 'arrow',
      id: arrowId,
      x: startX,
      y: startY,
      props: {
        start: {
          x: 0,
          y: 0,
        },
        end: {
          x: endX - startX,
          y: endY - startY,
        },
        color: arrowColor,
        size: arrowSize,
        dash: arrowDash,
        arrowheadStart: 'none',
        arrowheadEnd: 'arrow',
        richText: edge.label ? {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: edge.label
                }
              ]
            }
          ]
        } : undefined,
        font: 'sans',
      },
    });
  });

  // Zoom to fit all shapes
  editor.zoomToFit({ animation: { duration: 300 } });
}

/**
 * Calculates automatic layout for nodes based on diagram type
 */
function calculateLayout(spec: DiagramSpec): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  const nodeCount = spec.nodes.length;

  if (nodeCount === 0) return positions;

  switch (spec.type) {
    case 'sequence':
      return layoutSequence(spec.nodes, spec.edges);
    case 'tree':
      return layoutTree(spec.nodes, spec.edges);
    case 'flowchart':
      return layoutFlowchart(spec.nodes, spec.edges);
    case 'directed-graph':
    default:
      return layoutDirectedGraph(spec.nodes, spec.edges);
  }
}

/**
 * Sequence layout - arranges nodes left-to-right following edge flow
 */
function layoutSequence(nodes: DiagramNode[], edges: DiagramEdge[]): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  const startX = 150;
  const startY = 300;
  const horizontalSpacing = 400;
  const verticalSpacing = 250;

  // Build adjacency list
  const graph = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!graph.has(edge.from)) graph.set(edge.from, []);
    graph.get(edge.from)!.push(edge.to);
  });

  // Find nodes with no incoming edges (start nodes)
  const hasIncoming = new Set(edges.map(e => e.to));
  const startNodes = nodes.filter(n => !hasIncoming.has(n.id));
  
  if (startNodes.length === 0) {
    // Fallback to simple horizontal layout
    nodes.forEach((node, index) => {
      positions.set(node.id, {
        x: startX + index * horizontalSpacing,
        y: startY,
      });
    });
    return positions;
  }

  // Position nodes in sequence order (left to right)
  const visited = new Set<string>();

  function positionNode(nodeId: string, column: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const columnOffset = column * horizontalSpacing;
    const nodesInColumn = Array.from(visited).filter(id => {
      const pos = positions.get(id);
      return pos && Math.abs(pos.x - (startX + columnOffset)) < 50;
    }).length;

    positions.set(nodeId, {
      x: startX + columnOffset,
      y: startY + nodesInColumn * verticalSpacing,
    });

    const children = graph.get(nodeId) || [];
    children.forEach(childId => positionNode(childId, column + 1));
  }

  startNodes.forEach((node) => {
    positionNode(node.id, 0);
  });

  // Position any remaining unvisited nodes
  nodes.forEach((node, index) => {
    if (!visited.has(node.id)) {
      positions.set(node.id, {
        x: startX + 2 * horizontalSpacing,
        y: startY + index * verticalSpacing,
      });
    }
  });

  return positions;
}

/**
 * Directed graph layout - force-directed style with proper flow
 */
function layoutDirectedGraph(nodes: DiagramNode[], edges: DiagramEdge[]): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  
  const centerX = 600;
  const centerY = 400;
  const horizontalSpacing = 450;
  const verticalSpacing = 280;

  // Layer-based positioning
  const layers = assignLayers(nodes, edges);
  const maxLayer = Math.max(...Array.from(layers.values()));

  Array.from(layers.entries()).forEach(([nodeId, layer]) => {
    const nodesInLayer = Array.from(layers.entries()).filter(([_, l]) => l === layer);
    const indexInLayer = nodesInLayer.findIndex(([id]) => id === nodeId);
    const layerSize = nodesInLayer.length;

    positions.set(nodeId, {
      x: centerX + (layer - maxLayer / 2) * horizontalSpacing,
      y: centerY + (indexInLayer - layerSize / 2) * verticalSpacing,
    });
  });

  return positions;
}

/**
 * Flowchart layout - top-to-bottom with decision branches
 */
function layoutFlowchart(nodes: DiagramNode[], edges: DiagramEdge[]): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  const startX = 600;
  const startY = 100;
  const verticalSpacing = 250;
  const horizontalSpacing = 400;

  const layers = assignLayers(nodes, edges);

  Array.from(layers.entries()).forEach(([nodeId, layer]) => {
    const nodesInLayer = Array.from(layers.entries()).filter(([_, l]) => l === layer);
    const indexInLayer = nodesInLayer.findIndex(([id]) => id === nodeId);
    const layerSize = nodesInLayer.length;

    positions.set(nodeId, {
      x: startX + (indexInLayer - layerSize / 2) * horizontalSpacing,
      y: startY + layer * verticalSpacing,
    });
  });

  return positions;
}

/**
 * Helper function to assign layers based on graph structure
 */
function assignLayers(nodes: DiagramNode[], edges: DiagramEdge[]): Map<string, number> {
  const layers = new Map<string, number>();
  const visited = new Set<string>();
  
  // Build adjacency list
  const graph = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!graph.has(edge.from)) graph.set(edge.from, []);
    graph.get(edge.from)!.push(edge.to);
  });

  // Find root nodes
  const hasIncoming = new Set(edges.map(e => e.to));
  const roots = nodes.filter(n => !hasIncoming.has(n.id));

  function assignLayer(nodeId: string, layer: number) {
    if (visited.has(nodeId)) {
      // Update to deeper layer if necessary
      const currentLayer = layers.get(nodeId) || 0;
      if (layer > currentLayer) {
        layers.set(nodeId, layer);
      }
      return;
    }
    
    visited.add(nodeId);
    layers.set(nodeId, layer);
    
    const children = graph.get(nodeId) || [];
    children.forEach(childId => assignLayer(childId, layer + 1));
  }

  // Assign layers starting from roots
  if (roots.length > 0) {
    roots.forEach(root => assignLayer(root.id, 0));
  } else {
    // No clear root, start with first node
    assignLayer(nodes[0].id, 0);
  }

  // Assign remaining nodes
  nodes.forEach(node => {
    if (!layers.has(node.id)) {
      layers.set(node.id, 0);
    }
  });

  return layers;
}

/**
 * Tree layout - hierarchical layout
 */
function layoutTree(nodes: DiagramNode[], edges: any[]): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  
  // Find root nodes (nodes with no incoming edges)
  const hasIncoming = new Set(edges.map(e => e.to));
  const roots = nodes.filter(n => !hasIncoming.has(n.id));
  
  if (roots.length === 0) {
    // Fallback to directed graph layout if no clear hierarchy
    return layoutDirectedGraph(nodes, edges);
  }

  const startX = 400;
  const startY = 100;
  const levelHeight = 250;
  const nodeWidth = 350;

  // Simple level-based layout
  const levels: DiagramNode[][] = [];
  const visited = new Set<string>();
  
  function assignLevel(nodeId: string, level: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    if (!levels[level]) levels[level] = [];
    levels[level].push(node);
    
    const children = edges.filter(e => e.from === nodeId).map(e => e.to);
    children.forEach(childId => assignLevel(childId, level + 1));
  }

  roots.forEach(root => assignLevel(root.id, 0));
  
  // Unvisited nodes go to last level
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const lastLevel = levels.length;
      if (!levels[lastLevel]) levels[lastLevel] = [];
      levels[lastLevel].push(node);
    }
  });

  // Position nodes
  levels.forEach((levelNodes, levelIndex) => {
    const levelWidth = levelNodes.length * nodeWidth;
    const startXForLevel = startX - levelWidth / 2;
    
    levelNodes.forEach((node, nodeIndex) => {
      positions.set(node.id, {
        x: startXForLevel + nodeIndex * nodeWidth,
        y: startY + levelIndex * levelHeight,
      });
    });
  });

  return positions;
}

/**
 * Maps node kind to tldraw geo shape type
 */
function getShapeForKind(kind: string): string {
  switch (kind) {
    case 'actor':
      return 'ellipse'; // Round shape for people/users
    case 'service':
      return 'rectangle'; // Standard box for services
    case 'db':
      return 'cloud'; // Cloud shape for databases
    case 'queue':
      return 'hexagon'; // Hexagon for queues
    case 'component':
      return 'rectangle'; // Box for components
    case 'process':
      return 'diamond'; // Diamond for processes/decisions
    default:
      return 'rectangle';
  }
}

/**
 * Maps node kind to visual icon/symbol
 */
function getIconForKind(kind: string): string {
  switch (kind) {
    case 'actor':
      return '👤'; // Person icon
    case 'service':
      return '⚙️'; // Gear for service
    case 'db':
      return '💾'; // Database disk
    case 'queue':
      return '📬'; // Mailbox for queue
    case 'component':
      return '📦'; // Package for component
    case 'process':
      return '⚡'; // Lightning for process
    default:
      return '●';
  }
}

/**
 * Maps node kind to color
 */
function getColorForKind(kind: string): string {
  switch (kind) {
    case 'actor':
      return 'blue';
    case 'service':
      return 'green';
    case 'db':
      return 'orange';
    case 'queue':
      return 'violet';
    case 'component':
      return 'light-blue';
    case 'process':
      return 'yellow';
    default:
      return 'grey';
  }
}

/**
 * Helper functions for adding natural variation to diagrams
 */

// Random size variation (-10 to +20 pixels)
function getRandomVariation(): number {
  return Math.floor(Math.random() * 30) - 10;
}

// Random fill styles for variety
function getRandomFill(): 'none' | 'semi' | 'solid' | 'pattern' {
  const fills: Array<'none' | 'semi' | 'solid' | 'pattern'> = ['none', 'semi', 'solid', 'pattern'];
  return fills[Math.floor(Math.random() * fills.length)];
}

// Random dash styles for hand-drawn feel
function getRandomDash(): 'draw' | 'dashed' | 'dotted' | 'solid' {
  const dashes: Array<'draw' | 'dashed' | 'dotted' | 'solid'> = ['draw', 'draw', 'draw', 'dashed', 'dotted', 'solid'];
  return dashes[Math.floor(Math.random() * dashes.length)];
}

// Slight random rotation for organic feel (-5 to +5 degrees)
function getRandomRotation(): number {
  return (Math.random() - 0.5) * 0.17; // ~5 degrees in radians
}

// Random arrow dash styles
function getRandomArrowDash(): 'draw' | 'dashed' | 'dotted' | 'solid' {
  const dashes: Array<'draw' | 'dashed' | 'dotted' | 'solid'> = ['draw', 'draw', 'solid', 'dashed', 'dotted'];
  return dashes[Math.floor(Math.random() * dashes.length)];
}

// Random arrow colors for variety
function getRandomArrowColor(): string {
  const colors = ['black', 'grey', 'light-violet', 'light-blue'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Random arrow sizes
function getRandomArrowSize(): 's' | 'm' | 'l' {
  const sizes: Array<'s' | 'm' | 'l'> = ['s', 'm', 'm', 'l'];
  return sizes[Math.floor(Math.random() * sizes.length)];
}
