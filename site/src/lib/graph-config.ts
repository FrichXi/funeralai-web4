import type { StylesheetCSS } from 'cytoscape';
import type { GraphData, GraphNode, RelationType } from './types';
import { NODE_COLORS, RELATION_STYLES } from './constants';

// ── Node size configuration ──
export const NODE_SIZE = { MIN: 20, MAX: 80 };

// ── Zoom thresholds for label visibility ──
export const ZOOM_THRESHOLDS = {
  SHOW_ALL_LABELS: 0.8,
  SHOW_HIGH_DEGREE_LABELS: 0.4,
  HIGH_DEGREE_MIN: 10,
  HIGH_MENTION_MIN: 5,
};

// Tuning params — adjust after data changes; these are starting points
// ── fcose layout options ──
export const FCOSE_LAYOUT_OPTIONS = {
  name: 'fcose',
  quality: 'default',
  randomize: true,
  animate: true,
  animationDuration: 1000,
  nodeSeparation: 180,
  idealEdgeLength: (edge: { data: (key: string) => number }) =>
    180 + (1 / ((edge.data('weight') as number) || 1)) * 80,
  nodeRepulsion: (node: { data: (key: string) => number }) => {
    const degree = node.data('degree') || 0;
    return degree > 15 ? 25000 : degree > 8 ? 15000 : 10000;
  },
  gravity: 0.15,
  gravityRange: 5.0,
  numIter: 5000,
  nodeDimensionsIncludeLabels: true,
} as unknown as cytoscape.LayoutOptions;

// ── Pure functions ──

export function nodeSize(node: GraphNode): number {
  const w = node.composite_weight || 0;
  return NODE_SIZE.MIN + w * (NODE_SIZE.MAX - NODE_SIZE.MIN);
}

export function edgeWidth(weight: number): number {
  return Math.max(1, Math.min(4, Math.log2((weight || 1) + 1)));
}

export function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ── Build cytoscape stylesheet ──

export function buildStylesheet(): StylesheetCSS[] {
  return [
    // Default node style
    {
      selector: 'node',
      style: {
        'background-color': (ele: { data: (key: string) => string }) =>
          NODE_COLORS[ele.data('type')] || '#888',
        'border-width': 2,
        'border-color': (ele: { data: (key: string) => string }) =>
          lightenColor(NODE_COLORS[ele.data('type')] || '#888', 40),
        width: (ele: { data: (key: string) => number }) => nodeSize(ele.data('_raw') as unknown as GraphNode),
        height: (ele: { data: (key: string) => number }) => nodeSize(ele.data('_raw') as unknown as GraphNode),
        label: '',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        'font-size': 10,
        color: '#e0daf0',
        'font-family': '"Fusion Pixel", "Press Start 2P", system-ui',
        'text-outline-width': 2,
        'text-outline-color': '#0f0a1a',
        'text-max-width': '100px',
        'text-wrap': 'ellipsis',
        'min-zoomed-font-size': 0,
        'overlay-opacity': 0,
      },
    },
    {
      selector: 'node.show-label',
      style: { label: 'data(label)' },
    },
    {
      selector: 'node[?featured]',
      style: {
        'border-width': 3,
        'border-color': (ele: { data: (key: string) => string }) =>
          lightenColor(NODE_COLORS[ele.data('type')] || '#888', 60),
      },
    },
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 4,
        'border-color': '#ffffff',
        label: 'data(label)',
        'z-index': 20,
      },
    },
    {
      selector: 'node.neighbor',
      style: {
        label: 'data(label)',
        opacity: 1,
        'z-index': 15,
      },
    },
    {
      selector: 'node.dimmed',
      style: { opacity: 0.15 },
    },
    {
      selector: 'node.hovered',
      style: {
        label: 'data(label)',
        'border-width': 3,
        'border-color': '#ffffff',
        'z-index': 25,
      },
    },
    {
      selector: 'node.filtered-out',
      style: { display: 'none' },
    },

    // ── Edges ──
    {
      selector: 'edge',
      style: {
        width: (ele: { data: (key: string) => number }) => edgeWidth(ele.data('weight') as number),
        'line-color': (ele: { data: (key: string) => string }) => {
          const rt = ele.data('relation_type') as RelationType;
          return RELATION_STYLES[rt]?.color || '#555';
        },
        'line-style': (ele: { data: (key: string) => string }) => {
          const rt = ele.data('relation_type') as RelationType;
          return RELATION_STYLES[rt]?.lineStyle || 'solid';
        },
        'target-arrow-color': (ele: { data: (key: string) => string }) => {
          const rt = ele.data('relation_type') as RelationType;
          return RELATION_STYLES[rt]?.color || '#555';
        },
        'target-arrow-shape': (ele: { data: (key: string) => string }) => {
          const rt = ele.data('relation_type') as RelationType;
          return RELATION_STYLES[rt]?.arrow ? 'triangle' : 'none';
        },
        'curve-style': 'bezier',
        opacity: 0.6,
        'overlay-opacity': 0,
      },
    },
    {
      selector: 'edge.highlighted',
      style: { opacity: 1, 'z-index': 10 },
    },
    {
      selector: 'edge.dimmed',
      style: { opacity: 0.08 },
    },
  ] as unknown as StylesheetCSS[];
}

// ── Convert raw data to cytoscape elements ──

export function buildElements(data: GraphData) {
  const nodes = data.nodes.map((n) => ({
    data: {
      id: n.id,
      label: n.displayName || n.name,
      type: n.type,
      mention_count: n.mention_count,
      article_count: n.article_count,
      degree: n.degree,
      featured: n.featured || false,
      sizeBoost: n.sizeBoost || 1,
      composite_weight: n.composite_weight || 0,
      description: n.description,
      tags: n.tags,
      aliases: n.aliases,
      _raw: n,
    },
  }));

  const edges = data.links.map((l) => ({
    data: {
      id: `${l.source}-${l.target}-${l.relation_type}`,
      source: l.source,
      target: l.target,
      relation_type: l.relation_type,
      label: l.label,
      weight: l.weight,
      effective_weight: l.effective_weight,
      article_count: l.article_count,
    },
  }));

  return [...nodes, ...edges];
}
