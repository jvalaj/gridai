import ELK from 'elkjs/lib/elk.bundled.js';
import type { DiagramSpec } from '../types/index';

export interface ElkLayoutResult {
  nodePositions: Map<string, { x: number; y: number }>; // top-left
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
      'elk.layered.spacing.nodeNodeBetweenLayers': '150', // Increased spacing
      'elk.spacing.nodeNode': '80',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
      'elk.layered.cycleBreaking.strategy': 'GREEDY', // Better cycle handling
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'SPLINES', // Curved edges
      'elk.layered.unnecessaryBendpoints': 'true', // Cleaner edges
      'elk.layered.mergeEdges': 'true' // Merge parallel edges
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
  return { nodePositions: map };
}

export const LayoutConstants = { NODE_W, NODE_H };
