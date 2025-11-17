/**
 * Diagram Converter
 * 
 * Converts DiagramSpec JSON to tldraw shapes and arranges them automatically.
 */

import { createShapeId, Editor } from '@tldraw/tldraw';
import type { DiagramSpec, DiagramNode, DiagramEdge } from '../types/index';
import { computeElkLayout, LayoutConstants } from './elkLayout';

interface LayoutPosition {
  x: number;
  y: number;
}

function anchorOnRect(a: LayoutPosition, b: LayoutPosition, w: number, h: number) {
  const ax = a.x + w / 2;
  const ay = a.y + h / 2;
  const bx = b.x + w / 2;
  const by = b.y + h / 2;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return { x: ax, y: ay };
  const rx = w / 2;
  const ry = h / 2;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx * ry > absDy * rx) {
    const sign = Math.sign(dx) || 1;
    const x = ax + sign * rx;
    const y = ay + dy * (rx / (absDx || 1));
    return { x, y };
  } else {
    const sign = Math.sign(dy) || 1;
    const y = ay + sign * ry;
    const x = ax + dx * (ry / (absDy || 1));
    return { x, y };
  }
}


/**
 * Applies a DiagramSpec to a tldraw editor instance
 */
export async function applyDiagramToEditor(editor: Editor, spec: DiagramSpec) {
  console.log('Applying diagram to editor:', spec);
  
  // Clear existing shapes
  editor.selectAll();
  editor.deleteShapes(editor.getSelectedShapeIds());

  // Try ELK layered layout first; fallback to internal layout
  let nodePositions: Map<string, LayoutPosition>;
  try {
    const res = await computeElkLayout(spec);
    nodePositions = res.nodePositions as Map<string, LayoutPosition>;
  } catch (e) {
    console.warn('ELK layout failed, using fallback layout', e);
    nodePositions = calculateLayout(spec);
  }
  const shapeIds = new Map<string, any>();

  // Create node shapes with staggered animation
  for (let i = 0; i < spec.nodes.length; i++) {
    const node = spec.nodes[i];
    const pos = nodePositions.get(node.id);
    if (!pos) continue;

    const color = getColorForKind(node.kind);
    const geoShape = getShapeForKind(node.kind);
    const shapeId = createShapeId();
    shapeIds.set(node.id, shapeId);

    const icon = getIconForKind(node.kind);
    const labelText = `${icon} ${node.label}`;
    
    // Calculate dynamic node size based on content
    const textWidth = labelText.length * 8;
    const iconWidth = 20;
    const nodeWidth = Math.max(LayoutConstants.NODE_W, Math.min(300, textWidth + iconWidth + 40));
    const nodeHeight = LayoutConstants.NODE_H;
    
    console.log('Creating shape:', { id: node.id, label: labelText, geo: geoShape, pos });

    // Stagger node creation for drawing animation
    await new Promise(resolve => setTimeout(resolve, i * 80));

    // Use note shape for annotations, otherwise use geo shapes
    const isNote = node.kind === 'note' || node.kind === 'annotation';
    
    if (isNote) {
      // Create sticky note shape
      editor.createShape({
        type: 'note',
        id: shapeId,
        x: pos.x,
        y: pos.y,
        rotation: 0,
        opacity: 1,
        props: {
          w: nodeWidth,
          h: nodeHeight,
          color: color,
          text: labelText,
          align: 'middle',
          verticalAlign: 'middle',
          font: 'sans',
          size: 'm',
        },
      });
    } else {
      // Create geo shapes with centered label
      editor.createShape({
        type: 'geo',
        id: shapeId,
        x: pos.x,
        y: pos.y,
        rotation: 0,
        opacity: 1,
        props: {
          w: nodeWidth,
          h: nodeHeight,
          geo: geoShape,
          color: color,
          fill: 'semi',
          dash: 'solid',
          size: 'm',
          text: labelText,
          align: 'middle',
          verticalAlign: 'middle',
          font: 'sans',
        },
      });
    }
  }

  // Enhanced wave-based animation for nodes
  const animationWaves = Math.ceil(spec.nodes.length / 3);
  for (let wave = 0; wave < animationWaves; wave++) {
    setTimeout(() => {
      const startIdx = wave * 3;
      const endIdx = Math.min(startIdx + 3, spec.nodes.length);
      for (let i = startIdx; i < endIdx; i++) {
        const shapeId = shapeIds.get(spec.nodes[i].id);
        if (shapeId) {
          editor.updateShape({ 
            id: shapeId, 
            type: 'geo', 
            opacity: 1
            // Add scale animation
            // scale: 0.8
          });
          setTimeout(() => {
            editor.updateShape({ id: shapeId, type: 'geo'
              // scale: 1
            });
          }, 200);
        }
      }
    }, wave * 300);
  }

  // Wait for node animations to complete before starting edges
  setTimeout(() => {
    // Create edge shapes (arrows) with staggered animation
    for (let i = 0; i < spec.edges.length; i++) {
      const edge = spec.edges[i];
      const fromShapeId = shapeIds.get(edge.from);
      const toShapeId = shapeIds.get(edge.to);
      const fromPos = nodePositions.get(edge.from);
      const toPos = nodePositions.get(edge.to);
      
      if (!fromShapeId || !toShapeId || !fromPos || !toPos) continue;

      // Get node sizes for anchor calculation
      const fromNode = spec.nodes.find(n => n.id === edge.from);
      const toNode = spec.nodes.find(n => n.id === edge.to);
      const fromTextWidth = fromNode ? (fromNode.label.length * 8 + 40) : LayoutConstants.NODE_W;
      const toTextWidth = toNode ? (toNode.label.length * 8 + 40) : LayoutConstants.NODE_W;
      const fromWidth = Math.max(LayoutConstants.NODE_W, Math.min(300, fromTextWidth));
      const toWidth = Math.max(LayoutConstants.NODE_W, Math.min(300, toTextWidth));

      const start = anchorOnRect(fromPos, toPos, fromWidth, LayoutConstants.NODE_H);
      const end = anchorOnRect(toPos, fromPos, toWidth, LayoutConstants.NODE_H);

      const arrowId = createShapeId();

      editor.createShape({
        type: 'arrow',
        id: arrowId,
        x: start.x,
        y: start.y,
        opacity: 0,
        props: {
          start: { x: 0, y: 0 },
          end: { x: end.x - start.x, y: end.y - start.y },
          color: 'black',
          size: 'l', // Larger arrows
          dash: spec.type === 'flowchart' ? 'dashed' : 'solid', // Different styles for flowcharts
          arrowheadStart: 'none',
          arrowheadEnd: 'arrow',
          // Add curved edges for certain diagram types
          bend: spec.type === 'directed-graph' ? 0.3 : 0,
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

      // Fade in arrow with proper animation
      setTimeout(() => {
        editor.updateShape({ id: arrowId, type: 'arrow', opacity: 1 });
      }, 50);
    }
  }, animationWaves * 300 + 200);

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
      return 'cylinder'; // Cylinder for databases (classic DB shape)
    case 'queue':
      return 'hexagon'; // Hexagon for queues
    case 'component':
      return 'rectangle'; // Clean rectangles for components
    case 'process':
      return 'trapezoid'; // Trapezoid for processes
    case 'cache':
      return 'rhombus'; // Diamond for cache
    case 'storage':
      return 'cylinder'; // Cylinder for storage
    case 'external':
      return 'cloud'; // Cloud for external services
    case 'ui':
      return 'rectangle'; // Rectangle for UI elements
    case 'api':
      return 'hexagon'; // Hexagon for APIs
    case 'gateway':
      return 'pentagon'; // Pentagon for gateways
    case 'lb':
    case 'loadbalancer':
      return 'triangle'; // Triangle for load balancers
    case 'worker':
      return 'oval'; // Oval for workers
    case 'note':
    case 'annotation':
      return 'rectangle'; // Will use note type for these
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
      return '🔧'; // Gear for service
    case 'db':
      return '🗄️'; // Database icon
    case 'queue':
      return '📋'; // Queue/list icon
    case 'component':
      return '📦'; // Package for component
    case 'process':
      return '⚙️'; // Process wheel
    case 'cache':
      return '⚡'; // Lightning for cache
    case 'storage':
      return '💾'; // Disk for storage
    case 'external':
      return '☁️'; // Cloud for external
    case 'ui':
      return '🖥️'; // Screen for UI
    case 'api':
      return '🔌'; // Plug for API
    case 'gateway':
      return '🚪'; // Door for gateway
    case 'lb':
    case 'loadbalancer':
      return '⚖️'; // Scale for load balancer
    case 'worker':
      return '👷'; // Worker
    case 'note':
    case 'annotation':
      return '📝'; // Note
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
      return 'red';
    case 'cache':
      return 'yellow';
    case 'storage':
      return 'orange';
    case 'external':
      return 'grey';
    case 'ui':
      return 'blue';
    case 'api':
      return 'green';
    case 'gateway':
      return 'light-green';
    case 'lb':
    case 'loadbalancer':
      return 'light-violet';
    case 'worker':
      return 'light-red';
    case 'note':
    case 'annotation':
      return 'yellow';
    default:
      return 'grey';
  }
}

