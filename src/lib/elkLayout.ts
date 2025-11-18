import ELK from 'elkjs/lib/elk.bundled.js';
import type { DiagramSpec } from '../types/index';

export interface ElkLayoutResult {
  nodePositions: Map<string, { x: number; y: number }>; // top-left
  edgeRoutes?: Map<string, { sections: Array<{ startPoint: {x: number, y: number}, endPoint: {x: number, y: number}, bendPoints?: Array<{x: number, y: number}> }> }>;
}

const NODE_W = 220;
const NODE_H = 120;

const elk = new ELK();

export async function computeElkLayout(spec: DiagramSpec): Promise<ElkLayoutResult> {
  const direction =
    spec.type === 'flowchart' || spec.type === 'tree' ? 'DOWN' : 'RIGHT';

  // Calculate dynamic node sizes based on content
  const nodeSizes = spec.nodes.map((node: any) => {
    const textWidth = node.label.length * 8; // Rough character width
    const iconWidth = 20;
    return {
      width: Math.max(120, Math.min(300, textWidth + iconWidth + 40)),
      height: 80
    };
  });

  const graph: any = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.layered.spacing.nodeNodeBetweenLayers': '150',
      'elk.spacing.nodeNode': '100',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.crossingMinimization.semiInteractive': 'true',
      'elk.edgeRouting': 'ORTHOGONAL', // Orthogonal routing prevents crossings better
      'elk.layered.unnecessaryBendpoints': 'false',
      'elk.layered.mergeEdges': 'false',
      'elk.spacing.edgeNode': '50', // Space between edges and nodes
      'elk.spacing.edgeEdge': '30' // Space between edges
    },
    children: spec.nodes.map((n: any, i: number) => ({ 
      id: n.id, 
      width: nodeSizes[i].width, 
      height: nodeSizes[i].height,
      // Add ports for better edge connections
      ports: [
        { id: `${n.id}-top`, x: nodeSizes[i].width/2, y: 0 },
        { id: `${n.id}-bottom`, x: nodeSizes[i].width/2, y: nodeSizes[i].height },
        { id: `${n.id}-left`, x: 0, y: nodeSizes[i].height/2 },
        { id: `${n.id}-right`, x: nodeSizes[i].width, y: nodeSizes[i].height/2 }
      ]
    })),
    edges: spec.edges.map((e: any, i: number) => ({ 
      id: `${e.from}-${e.to}-${i}`, 
      sources: [`${e.from}-right`], // Use ports for better connections
      targets: [`${e.to}-left`]
    })),
  };

  const res = await elk.layout(graph);

  const map = new Map<string, { x: number; y: number }>();
  for (const child of res.children ?? []) {
    map.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }
  
  // Capture edge routing information
  const edgeRoutes = new Map();
  for (const edge of res.edges ?? []) {
    if (edge.sections && edge.sections.length > 0) {
      edgeRoutes.set(edge.id, { sections: edge.sections });
    }
  }
  
  return { nodePositions: map, edgeRoutes };
}

export const LayoutConstants = { NODE_W, NODE_H };
