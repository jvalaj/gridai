/**
 * useForceGraph Hook
 * 
 * React hook that manages the d3-force simulation for the graph.
 * Handles:
 * - Simulation lifecycle
 * - Node position updates
 * - Efficient re-renders
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Simulation } from 'd3-force';
import {
  createSimulation,
  updateSimulation,
  toSimulationNode,
  toSimulationLink,
  type SimulationNode,
  type SimulationLink,
} from '../lib/graphEngine';
import type { GraphNode, GraphEdge } from '../types';

export function useForceGraph(nodes: GraphNode[], edges: GraphEdge[]) {
  const simulationRef = useRef<Simulation<SimulationNode, SimulationLink> | null>(null);
  const [simulationNodes, setSimulationNodes] = useState<SimulationNode[]>([]);
  const [simulationLinks, setSimulationLinks] = useState<SimulationLink[]>([]);

  // Convert nodes and edges to simulation format
  useEffect(() => {
    const simNodes = nodes.map(toSimulationNode);
    const simLinks = edges
      .map((edge) => toSimulationLink(edge, simNodes))
      .filter((link): link is SimulationLink => link !== null);

    setSimulationNodes(simNodes);
    setSimulationLinks(simLinks);
  }, [nodes, edges]);

  // Initialize or update simulation
  useEffect(() => {
    if (simulationNodes.length === 0) {
      // Clean up if no nodes
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      return;
    }

    if (!simulationRef.current) {
      // Create new simulation
      const simulation = createSimulation(simulationNodes, simulationLinks);
      simulationRef.current = simulation;

      // Update state on each tick
      simulation.on('tick', () => {
        setSimulationNodes([...simulation.nodes()]);
      });
    } else {
      // Update existing simulation
      updateSimulation(simulationRef.current, simulationNodes, simulationLinks);
    }

    // Cleanup
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [simulationNodes, simulationLinks]);

  // Get current node positions
  const getNodePosition = useCallback(
    (nodeId: string): { x: number; y: number } | null => {
      const node = simulationNodes.find((n) => n.id === nodeId);
      if (!node || node.x === undefined || node.y === undefined) {
        return null;
      }
      return { x: node.x, y: node.y };
    },
    [simulationNodes]
  );

  // Pin/unpin a node
  const pinNode = useCallback((nodeId: string, x: number | null, y: number | null) => {
    if (!simulationRef.current) return;

    const node = simulationRef.current.nodes().find((n) => n.id === nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
      simulationRef.current.alpha(0.3).restart();
    }
  }, []);

  // Unpin all nodes
  const unpinAll = useCallback(() => {
    if (!simulationRef.current) return;

    simulationRef.current.nodes().forEach((node) => {
      node.fx = null;
      node.fy = null;
    });
    simulationRef.current.alpha(0.3).restart();
  }, []);

  return {
    nodes: simulationNodes,
    links: simulationLinks,
    getNodePosition,
    pinNode,
    unpinAll,
  };
}

