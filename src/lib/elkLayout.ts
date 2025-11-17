import ELK from 'elkjs/lib/elk.bundled.js';
import type { DiagramSpec } from '../types';

export interface ElkLayoutResult {
  nodePositions: Map<string, { x: number; y: number }>; // top-left
}

const NODE_W = 220;
const NODE_H = 120;

const elk = new ELK();

export async function computeElkLayout(spec: DiagramSpec): Promise<ElkLayoutResult> {
  const direction =
    spec.type === 'flowchart' || spec.type === 'tree' ? 'DOWN' : 'RIGHT';

  const graph: any = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.spacing.nodeNode': '120',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
      'elk.layered.cycleBreaking.strategy': 'INTERACTIVE',
      'elk.layered.crossingMinimization.semiInteractive': 'true',
      'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: spec.nodes.map((n) => ({ id: n.id, width: NODE_W, height: NODE_H })),
    edges: spec.edges.map((e, i) => ({ id: `${e.from}-${e.to}-${i}` , sources: [e.from], targets: [e.to] })),
  };

  const res = await elk.layout(graph);

  const map = new Map<string, { x: number; y: number }>();
  for (const child of res.children ?? []) {
    map.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }
  return { nodePositions: map };
}

export const LayoutConstants = { NODE_W, NODE_H };
