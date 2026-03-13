import type { RelationType } from './types';

// ── Brand colors ──
export const BRAND = {
  purple: '#7351cf',
  purpleLight: '#9b7de8',
  purpleDark: '#5438a0',
  pink: '#f5a0b8',
  pinkDark: '#d97090',
} as const;

// ── Node type colors ──
export const NODE_COLORS: Record<string, string> = {
  company: '#7351cf',   // brand purple
  product: '#10b981',   // emerald
  person: '#f59e0b',    // amber
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  company: '公司',
  product: '产品',
  person: '人物',
};

// ── Relation categories & colors ──

export interface RelationStyle {
  color: string;
  lineStyle: 'solid' | 'dashed';
  arrow: boolean;
  category: string;
  label: string;
}

export const RELATION_STYLES: Record<RelationType, RelationStyle> = {
  // structural
  develops:     { color: '#60a5fa', lineStyle: 'solid', arrow: true,  category: '结构', label: '开发' },
  works_on:     { color: '#60a5fa', lineStyle: 'solid', arrow: true,  category: '结构', label: '参与' },
  works_at:     { color: '#60a5fa', lineStyle: 'solid', arrow: true,  category: '结构', label: '就职' },
  // founding
  founder_of:   { color: '#f59e0b', lineStyle: 'solid', arrow: true,  category: '创始', label: '创立' },
  co_founded:   { color: '#f59e0b', lineStyle: 'solid', arrow: true,  category: '创始', label: '联合创立' },
  // investment
  invests_in:   { color: '#a78bfa', lineStyle: 'solid', arrow: true,  category: '投资', label: '投资' },
  acquires:     { color: '#a78bfa', lineStyle: 'solid', arrow: true,  category: '投资', label: '收购' },
  // competition
  competes_with:{ color: '#ef4444', lineStyle: 'dashed', arrow: false, category: '竞争', label: '竞争' },
  compares_to:  { color: '#94a3b8', lineStyle: 'dashed', arrow: false, category: '竞争', label: '对比' },
  // collaboration
  collaborates_with: { color: '#22d3ee', lineStyle: 'solid', arrow: false, category: '合作', label: '合作' },
  partners_with:     { color: '#22d3ee', lineStyle: 'solid', arrow: false, category: '合作', label: '合作伙伴' },
  integrates_with:   { color: '#22d3ee', lineStyle: 'solid', arrow: false, category: '合作', label: '集成' },
  // evaluation
  praises:    { color: '#34d399', lineStyle: 'solid', arrow: true, category: '评价', label: '赞扬' },
  criticizes: { color: '#fb923c', lineStyle: 'solid', arrow: true, category: '评价', label: '批评' },
  mentors:    { color: '#34d399', lineStyle: 'solid', arrow: true, category: '评价', label: '指导' },
};

// ── Relation category colors (for legend) ──
export const RELATION_CATEGORIES = [
  { key: '结构', color: '#60a5fa', label: '结构（开发/参与/就职）' },
  { key: '创始', color: '#f59e0b', label: '创始' },
  { key: '投资', color: '#a78bfa', label: '投资/收购' },
  { key: '竞争', color: '#ef4444', label: '竞争/对比' },
  { key: '合作', color: '#22d3ee', label: '合作/集成' },
  { key: '评价', color: '#34d399', label: '评价（赞扬/批评）' },
];

// ── Leaderboard segment config ──
export const LEADERBOARD_SEGMENTS = [
  { key: 'products' as const, label: '产品' },
  { key: 'founders' as const, label: '创始人' },
  { key: 'vcs' as const, label: '投资机构' },
  { key: 'companies' as const, label: '公司' },
];
