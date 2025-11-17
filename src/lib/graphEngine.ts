/**
 * Graph Engine
 * 
 * Manages the force-directed graph layout using d3-force.
 * 
 * This module:
 * - Initializes and manages the d3-force simulation
 * - Updates node positions based on forces
 * - Handles node/edge updates efficiently
 * - Provides a React hook interface
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
  type Simulation,
} from 'd3-force';
import type { GraphNode, GraphEdge } from '../types';

export interface SimulationNode extends SimulationNodeDatum {
  id: string;
  messageId: string;
  fx?: number | null;
  fy?: number | null;
}

export interface SimulationLink extends SimulationLinkDatum<SimulationNode> {
  id: string;
  type: 'chronological' | 'similarity';
}

/**
 * Creates a new d3-force simulation with appropriate forces.
 */
export function createSimulation(
  nodes: SimulationNode[],
  links: SimulationLink[]
): Simulation<SimulationNode, SimulationLink> {
  // Use the provided positions (they should already be in tree structure)
  const initializedNodes = nodes.map((node) => {
    // Keep the tree positions that were calculated
    return node;
  });

  const simulation = forceSimulation<SimulationNode>(initializedNodes)
    .force(
      'link',
      forceLink<SimulationNode, SimulationLink>(links)
        .id((d) => d.id)
        .distance((link) => {
          // Tree structure: vertical spacing for chronological links
          return link.type === 'chronological' ? 250 : 200;
        })
        .strength(0.8) // Stronger links to maintain tree structure
    )
    .force('charge', forceManyBody().strength(-200)) // Reduced charge to allow closer spacing
    .force('center', forceCenter(0, 0))
    .force(
      'collision',
      forceCollide().radius(160).strength(0.9) // Card width/2 + padding
    )
    .alphaDecay(0.02) // Slower decay for smoother animation
    .velocityDecay(0.4)
    .alpha(0.5); // Lower initial alpha to preserve tree positions

  return simulation;
}

/**
 * Updates the simulation with new nodes and links.
 * Preserves positions of existing nodes when possible.
 */
export function updateSimulation(
  simulation: Simulation<SimulationNode, SimulationLink>,
  nodes: SimulationNode[],
  links: SimulationLink[]
): void {
  // Update nodes
  const nodeMap = new Map(simulation.nodes().map((n: SimulationNode) => [n.id, n]));
  
  const updatedNodes = nodes.map((node) => {
    const existing = nodeMap.get(node.id);
    if (existing && existing.x !== undefined && existing.y !== undefined) {
      // Preserve position and velocity
      return {
        ...node,
        x: existing.x ?? node.x,
        y: existing.y ?? node.y,
        vx: existing.vx,
        vy: existing.vy,
        fx: node.fx,
        fy: node.fy,
      };
    }
    return node;
  });

  // Update links
  const linkForce = simulation.force<ReturnType<typeof forceLink<SimulationNode, SimulationLink>>>('link');
  if (linkForce) {
    linkForce.links(links);
  }

  // Update nodes in simulation
  simulation.nodes(updatedNodes);
  
  // Restart simulation with low alpha for smooth transition
  simulation.alpha(0.3).restart();
}

/**
 * Converts GraphNode to SimulationNode
 */
export function toSimulationNode(node: GraphNode): SimulationNode {
  return {
    id: node.id,
    messageId: node.messageId,
    x: node.x,
    y: node.y,
    fx: node.fx,
    fy: node.fy,
  };
}

/**
 * Converts GraphEdge to SimulationLink
 */
export function toSimulationLink(
  edge: GraphEdge,
  nodes: SimulationNode[]
): SimulationLink | null {
  const source = nodes.find((n) => n.id === edge.sourceId);
  const target = nodes.find((n) => n.id === edge.targetId);
  
  if (!source || !target) return null;
  
  return {
    id: edge.id,
    source,
    target,
    type: edge.type,
  };
}

