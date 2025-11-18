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

      // Get node sizes for center calculation
      const fromNode = spec.nodes.find(n => n.id === edge.from);
      const toNode = spec.nodes.find(n => n.id === edge.to);
      const fromTextWidth = fromNode ? (fromNode.label.length * 8 + 40) : LayoutConstants.NODE_W;
      const toTextWidth = toNode ? (toNode.label.length * 8 + 40) : LayoutConstants.NODE_W;
      const fromWidth = Math.max(LayoutConstants.NODE_W, Math.min(300, fromTextWidth));
      const toWidth = Math.max(LayoutConstants.NODE_W, Math.min(300, toTextWidth));

      // Connect arrows to shape centers
      const fromCenterX = fromPos.x + fromWidth / 2;
      const fromCenterY = fromPos.y + LayoutConstants.NODE_H / 2;
      const toCenterX = toPos.x + toWidth / 2;
      const toCenterY = toPos.y + LayoutConstants.NODE_H / 2;

      const arrowId = createShapeId();

      // Calculate bend to avoid crossings
      const dx = toCenterX - fromCenterX;
      const dy = toCenterY - fromCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Use higher bend for longer distances to route around obstacles (bend is in pixels)
      const bendAmount = distance > 400 ? 80 : distance > 250 ? 50 : 30;

      // Create arrow with proper coordinate format
      editor.createShape({
        type: 'arrow',
        id: arrowId,
        x: fromCenterX,
        y: fromCenterY,
        opacity: 0,
        props: {
          start: { 
            x: 0,
            y: 0
          },
          end: { 
            x: toCenterX - fromCenterX,
            y: toCenterY - fromCenterY
          },
          color: 'black',
          size: 'm',
          dash: spec.type === 'flowchart' ? 'dashed' : 'solid',
          arrowheadStart: 'none',
          arrowheadEnd: 'arrow',
          bend: bendAmount,
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
          } : {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: []
              }
            ]
          },
          font: 'sans',
        },
      });
      
      // Fade in arrow with proper animation
      setTimeout(() => {
        editor.updateShape({ id: arrowId, type: 'arrow', opacity: 0.8 });
      }, 50);

      // Fade in arrow with proper animation
      setTimeout(() => {
        editor.updateShape({ id: arrowId, type: 'arrow', opacity: 0.8 });
      }, 50);
    }
    
    // Bring all nodes to front after arrows are created
    setTimeout(() => {
      const arrowIds = Array.from(editor.getCurrentPageShapeIds()).filter(id => 
        editor.getShape(id)?.type === 'arrow'
      );
      if (arrowIds.length > 0) {
        editor.sendToBack(arrowIds);
      }
    }, 100);
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
    case 'state-machine':
      return layoutStateMachine(spec.nodes, spec.edges);
    case 'entity-relationship':
      return layoutEntityRelationship(spec.nodes, spec.edges);
    case 'network':
      return layoutNetwork(spec.nodes, spec.edges);
    case 'timeline':
      return layoutTimeline(spec.nodes, spec.edges);
    case 'class-diagram':
      return layoutClassDiagram(spec.nodes, spec.edges);
    case 'deployment':
      return layoutDeployment(spec.nodes, spec.edges);
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
  const startX = 200;
  const startY = 350;
  const horizontalSpacing = 750; // Increased for more space between columns
  const verticalSpacing = 450; // Increased for more space between rows

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
  
  const centerX = 700;
  const centerY = 450;
  const horizontalSpacing = 600; // Increased from 450
  const verticalSpacing = 380; // Increased from 280

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
  const startX = 700;
  const startY = 150;
  const verticalSpacing = 350; // Increased from 250
  const horizontalSpacing = 550; // Increased from 400

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

  const startX = 500;
  const startY = 150;
  const levelHeight = 350; // Increased from 250
  const nodeWidth = 500; // Increased from 350

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
 * State machine layout - circular with central starting state
 */
function layoutStateMachine(nodes: DiagramNode[], _edges: DiagramEdge[]): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  const centerX = 600;
  const centerY = 400;
  const radius = 350;
  
  // Circular layout for states
  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    positions.set(node.id, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  });
  
  return positions;
}

/**
 * Entity-relationship layout - grid-based with entities as clusters
 */
function layoutEntityRelationship(nodes: DiagramNode[], _edges: DiagramEdge[]): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  const startX = 300;
  const startY = 200;
  const horizontalSpacing = 600;
  const verticalSpacing = 400;
  const cols = Math.ceil(Math.sqrt(nodes.length));
  
  nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    positions.set(node.id, {
      x: startX + col * horizontalSpacing,
      y: startY + row * verticalSpacing,
    });
  });
  
  return positions;
}

/**
 * Network topology layout - hierarchical with hub at center
 */
function layoutNetwork(nodes: DiagramNode[], edges: DiagramEdge[]): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  
  // Find hub nodes (nodes with most connections)
  const connectionCount = new Map<string, number>();
  edges.forEach(edge => {
    connectionCount.set(edge.from, (connectionCount.get(edge.from) || 0) + 1);
    connectionCount.set(edge.to, (connectionCount.get(edge.to) || 0) + 1);
  });
  
  const sortedNodes = [...nodes].sort((a, b) => 
    (connectionCount.get(b.id) || 0) - (connectionCount.get(a.id) || 0)
  );
  
  const centerX = 600;
  const centerY = 400;
  const innerRadius = 250;
  const outerRadius = 500;
  
  // Place hub nodes in inner circle
  const hubCount = Math.min(3, Math.floor(nodes.length * 0.3));
  sortedNodes.slice(0, hubCount).forEach((node, index) => {
    const angle = (index / hubCount) * 2 * Math.PI;
    positions.set(node.id, {
      x: centerX + innerRadius * Math.cos(angle),
      y: centerY + innerRadius * Math.sin(angle),
    });
  });
  
  // Place other nodes in outer circle
  const peripheralNodes = sortedNodes.slice(hubCount);
  peripheralNodes.forEach((node, index) => {
    const angle = (index / peripheralNodes.length) * 2 * Math.PI;
    positions.set(node.id, {
      x: centerX + outerRadius * Math.cos(angle),
      y: centerY + outerRadius * Math.sin(angle),
    });
  });
  
  return positions;
}

/**
 * Timeline layout - strictly horizontal left-to-right
 */
function layoutTimeline(nodes: DiagramNode[], _edges: DiagramEdge[]): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  const startX = 200;
  const y = 400;
  const spacing = 600;
  
  // Simple horizontal timeline
  nodes.forEach((node, index) => {
    positions.set(node.id, {
      x: startX + index * spacing,
      y: y,
    });
  });
  
  return positions;
}

/**
 * Class diagram layout - grouped by relationships
 */
function layoutClassDiagram(nodes: DiagramNode[], _edges: DiagramEdge[]): Map<string, LayoutPosition> {
  // Similar to entity-relationship but with tighter spacing
  const positions = new Map<string, LayoutPosition>();
  const startX = 300;
  const startY = 200;
  const horizontalSpacing = 500;
  const verticalSpacing = 350;
  const cols = Math.ceil(Math.sqrt(nodes.length));
  
  nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    positions.set(node.id, {
      x: startX + col * horizontalSpacing,
      y: startY + row * verticalSpacing,
    });
  });
  
  return positions;
}

/**
 * Deployment diagram layout - layered by environment/tier
 */
function layoutDeployment(nodes: DiagramNode[], edges: DiagramEdge[]): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  const layers = assignLayers(nodes, edges);
  const startX = 700;
  const startY = 200;
  const layerHeight = 400;
  const nodeSpacing = 550;
  
  // Group nodes by layer and spread horizontally
  const layerGroups = new Map<number, DiagramNode[]>();
  nodes.forEach(node => {
    const layer = layers.get(node.id) || 0;
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(node);
  });
  
  layerGroups.forEach((nodesInLayer, layer) => {
    const layerWidth = nodesInLayer.length * nodeSpacing;
    const layerStartX = startX - layerWidth / 2;
    
    nodesInLayer.forEach((node, index) => {
      positions.set(node.id, {
        x: layerStartX + index * nodeSpacing,
        y: startY + layer * layerHeight,
      });
    });
  });
  
  return positions;
}

/**
 * Maps node kind to tldraw geo shape type
 */
function getShapeForKind(kind: string): string {
  // Valid tldraw geo shapes: cloud, rectangle, ellipse, triangle, diamond, pentagon, 
  // hexagon, octagon, star, rhombus, rhombus-2, oval, trapezoid, arrow-right, 
  // arrow-left, arrow-up, arrow-down, x-box, check-box, heart
  
  switch (kind) {
    case 'actor':
      return 'ellipse';
    case 'service':
    case 'server':
      return 'rectangle';
    case 'db':
    case 'storage':
      return 'octagon';
    case 'queue':
    case 'stream':
    case 'pubsub':
      return 'hexagon';
    case 'component':
    case 'container':
    case 'file':
      return 'rectangle';
    case 'process':
    case 'function':
    case 'lambda':
      return 'trapezoid';
    case 'cache':
      return 'rhombus';
    case 'external':
    case 'cdn':
      return 'cloud';
    case 'ui':
    case 'client':
    case 'browser':
    case 'mobile':
      return 'rectangle';
    case 'api':
    case 'webhook':
      return 'hexagon';
    case 'gateway':
    case 'proxy':
    case 'router':
      return 'pentagon';
    case 'lb':
    case 'loadbalancer':
      return 'triangle';
    case 'worker':
    case 'scheduler':
      return 'oval';
    case 'firewall':
    case 'auth':
      return 'diamond';
    case 'monitoring':
    case 'analytics':
    case 'log':
      return 'star';
    case 'payment':
    case 'email':
    case 'notification':
      return 'hexagon';
    case 'backup':
    case 'registry':
      return 'octagon';
    case 'orchestrator':
    case 'switch':
      return 'rhombus-2';
    case 'search':
      return 'hexagon';
    case 'note':
    case 'annotation':
      return 'rectangle';
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
      return '👤';
    case 'service':
      return '🔧';
    case 'server':
      return '🖥️';
    case 'db':
      return '🗄️';
    case 'queue':
      return '📋';
    case 'component':
      return '📦';
    case 'process':
      return '⚙️';
    case 'cache':
      return '⚡';
    case 'storage':
      return '💾';
    case 'external':
      return '☁️';
    case 'ui':
      return '🖥️';
    case 'client':
      return '💻';
    case 'browser':
      return '🌐';
    case 'mobile':
      return '📱';
    case 'api':
      return '🔌';
    case 'gateway':
      return '🚪';
    case 'lb':
    case 'loadbalancer':
      return '⚖️';
    case 'worker':
      return '👷';
    case 'container':
      return '📦';
    case 'function':
    case 'lambda':
      return 'λ';
    case 'cdn':
      return '🌍';
    case 'firewall':
      return '🛡️';
    case 'router':
    case 'switch':
      return '🔀';
    case 'monitoring':
      return '📊';
    case 'analytics':
      return '📈';
    case 'auth':
      return '🔐';
    case 'payment':
      return '💳';
    case 'email':
      return '📧';
    case 'notification':
      return '🔔';
    case 'file':
      return '📄';
    case 'log':
      return '📝';
    case 'backup':
      return '💿';
    case 'scheduler':
      return '⏰';
    case 'orchestrator':
      return '🎯';
    case 'registry':
      return '📚';
    case 'search':
      return '🔍';
    case 'stream':
      return '〰️';
    case 'pubsub':
      return '📡';
    case 'webhook':
      return '🪝';
    case 'proxy':
      return '🔄';
    case 'note':
    case 'annotation':
      return '📝';
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
    case 'server':
      return 'green';
    case 'db':
    case 'storage':
    case 'backup':
      return 'orange';
    case 'queue':
    case 'stream':
    case 'pubsub':
      return 'violet';
    case 'component':
    case 'container':
      return 'light-blue';
    case 'process':
    case 'function':
    case 'lambda':
      return 'red';
    case 'cache':
      return 'yellow';
    case 'external':
    case 'cdn':
      return 'grey';
    case 'ui':
    case 'client':
      return 'blue';
    case 'browser':
    case 'mobile':
      return 'light-blue';
    case 'api':
    case 'webhook':
      return 'green';
    case 'gateway':
    case 'proxy':
    case 'router':
      return 'light-green';
    case 'lb':
    case 'loadbalancer':
      return 'light-violet';
    case 'worker':
    case 'scheduler':
      return 'light-red';
    case 'firewall':
    case 'auth':
      return 'red';
    case 'monitoring':
    case 'analytics':
    case 'log':
      return 'blue';
    case 'payment':
      return 'green';
    case 'email':
    case 'notification':
      return 'yellow';
    case 'file':
      return 'grey';
    case 'orchestrator':
    case 'switch':
      return 'violet';
    case 'registry':
    case 'search':
      return 'light-violet';
    case 'note':
    case 'annotation':
      return 'yellow';
    default:
      return 'grey';
  }
}

