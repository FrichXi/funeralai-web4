import type {
  RelationType,
  NodeType,
  SponsorLeaderboardEntry,
  SponsorRecord,
} from './types';
import {
  BRAND_COLORS,
  SEMANTIC_ENTITY_COLORS,
  SEMANTIC_RELATION_COLORS,
} from './visual-tokens';

// ── Brand colors ──
export const BRAND = BRAND_COLORS;

// ── Node type registry (single source of truth) ──
export const NODE_TYPE_REGISTRY: Record<NodeType, {
  color: string;
  label: string;
  badgeClass: string;
}> = {
  company:  { color: SEMANTIC_ENTITY_COLORS.company, label: '公司',     badgeClass: 'bg-[#7351cf] border-[#7351cf] text-white' },
  product:  { color: SEMANTIC_ENTITY_COLORS.product, label: '产品',     badgeClass: 'bg-[#10b981] border-[#10b981] text-white' },
  person:   { color: SEMANTIC_ENTITY_COLORS.person, label: '人物',     badgeClass: 'bg-[#f59e0b] border-[#f59e0b] text-white' },
  vc_firm:  { color: SEMANTIC_ENTITY_COLORS.vcFirm, label: '投资机构', badgeClass: 'bg-[#2dd4bf] border-[#2dd4bf] text-white' },
};

// ── Derived constants (backward compatible) ──
export const NODE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(NODE_TYPE_REGISTRY).map(([k, v]) => [k, v.color])
);

export const NODE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(NODE_TYPE_REGISTRY).map(([k, v]) => [k, v.label])
);

export const NODE_BADGE_CLASSES: Record<string, string> = Object.fromEntries(
  Object.entries(NODE_TYPE_REGISTRY).map(([k, v]) => [k, v.badgeClass])
);

export const ALL_NODE_TYPES = Object.keys(NODE_TYPE_REGISTRY) as NodeType[];

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
  develops:     { color: SEMANTIC_RELATION_COLORS.structure, lineStyle: 'solid', arrow: true,  category: '结构', label: '开发' },
  works_on:     { color: SEMANTIC_RELATION_COLORS.structure, lineStyle: 'solid', arrow: true,  category: '结构', label: '参与' },
  works_at:     { color: SEMANTIC_RELATION_COLORS.structure, lineStyle: 'solid', arrow: true,  category: '结构', label: '就职' },
  // founding
  founder_of:   { color: SEMANTIC_RELATION_COLORS.founding, lineStyle: 'solid', arrow: true,  category: '创始', label: '创立' },
  co_founded:   { color: SEMANTIC_RELATION_COLORS.founding, lineStyle: 'solid', arrow: true,  category: '创始', label: '联合创立' },
  // investment
  invests_in:   { color: SEMANTIC_RELATION_COLORS.investment, lineStyle: 'solid', arrow: true,  category: '投资', label: '投资' },
  acquires:     { color: SEMANTIC_RELATION_COLORS.investment, lineStyle: 'solid', arrow: true,  category: '投资', label: '收购' },
  // competition
  competes_with:{ color: SEMANTIC_RELATION_COLORS.competition, lineStyle: 'dashed', arrow: false, category: '竞争', label: '竞争' },
  compares_to:  { color: SEMANTIC_RELATION_COLORS.neutral, lineStyle: 'dashed', arrow: false, category: '竞争', label: '对比' },
  // collaboration
  collaborates_with: { color: SEMANTIC_RELATION_COLORS.collaboration, lineStyle: 'solid', arrow: false, category: '合作', label: '合作' },
  partners_with:     { color: SEMANTIC_RELATION_COLORS.collaboration, lineStyle: 'solid', arrow: false, category: '合作', label: '合作伙伴' },
  integrates_with:   { color: SEMANTIC_RELATION_COLORS.collaboration, lineStyle: 'solid', arrow: false, category: '合作', label: '集成' },
  // evaluation
  praises:    { color: SEMANTIC_RELATION_COLORS.positive, lineStyle: 'solid', arrow: true, category: '评价', label: '赞扬' },
  criticizes: { color: SEMANTIC_RELATION_COLORS.critical, lineStyle: 'solid', arrow: true, category: '评价', label: '批评' },
  mentors:    { color: SEMANTIC_RELATION_COLORS.positive, lineStyle: 'solid', arrow: true, category: '评价', label: '指导' },
  related:    { color: SEMANTIC_RELATION_COLORS.neutral, lineStyle: 'dashed', arrow: false, category: '其他', label: '相关' },
};

// ── Relation category colors (for legend) ──
export const RELATION_CATEGORIES = [
  { key: '结构', color: SEMANTIC_RELATION_COLORS.structure, label: '结构（开发/参与/就职）' },
  { key: '创始', color: SEMANTIC_RELATION_COLORS.founding, label: '创始' },
  { key: '投资', color: SEMANTIC_RELATION_COLORS.investment, label: '投资/收购' },
  { key: '竞争', color: SEMANTIC_RELATION_COLORS.competition, label: '竞争/对比' },
  { key: '合作', color: SEMANTIC_RELATION_COLORS.collaboration, label: '合作/集成' },
  { key: '评价', color: SEMANTIC_RELATION_COLORS.positive, label: '评价（赞扬/批评）' },
  { key: '其他', color: SEMANTIC_RELATION_COLORS.neutral, label: '其他（相关）' },
];

// ── Z-index hierarchy ──
// Layers from bottom to top:
//   GRAPH_CONTROLS (20) — filter/search panels on graph page
//   GRAPH_LEGEND   (20) — type legend overlay on graph page
//   GRAPH_TOOLTIP  (30) — hover tooltip on graph nodes
//   ENTITY_DRAWER  (40) — slide-out entity detail panel
//   NAVBAR         (50) — top navigation bar (always on top)
export const Z_INDEX = {
  GRAPH_CONTROLS: 20,
  GRAPH_LEGEND: 20,
  GRAPH_TOOLTIP: 30,
  ENTITY_DRAWER: 40,
  NAVBAR: 50,
} as const;

// ── Leaderboard segment config ──
export const LEADERBOARD_SEGMENTS = [
  { key: 'products' as const, label: '产品' },
  { key: 'founders' as const, label: '创始人' },
  { key: 'vcs' as const, label: '投资机构' },
  { key: 'companies' as const, label: '公司' },
];

// ── Sponsor data (hardcoded) ──
export const SPONSOR_RECORDS: SponsorRecord[] = [
  {
    id: 'justin-hds',
    name: 'Justin&韩德胜',
    amount: 400,
    sortOrder: 1,
    lockedTitle: '葬爱Web4唯一指定金主',
    trailingLabel: '老资历',
    trailingLabelVariant: 'badge',
    legacyVariant: 'primary',
  },
  {
    id: 'doge',
    name: 'Doge',
    amount: 200,
    sortOrder: 2,
    lockedTitle: '葬爱Web4唯二指定金主',
    trailingLabel: '老资历',
    trailingLabelVariant: 'badge',
    legacyVariant: 'secondary',
  },
  {
    id: 'guancha',
    name: '观猹',
    amount: 1588,
    sortOrder: 3,
    trailingLabel: 'watcha.cn',
    trailingLabelVariant: 'plain',
  },
  {
    id: 'guixingren',
    name: '硅星人',
    amount: 1066,
    sortOrder: 4,
  },
  {
    id: 'yizhiyanhua-community',
    name: '一支烟花社区&阿里千问',
    amount: 888,
    sortOrder: 5,
  },
  {
    id: 'citron',
    name: 'Citron',
    amount: 600,
    sortOrder: 6,
  },
  {
    id: 'erinyu',
    name: 'Erinyu',
    amount: 200,
    sortOrder: 7,
  },
  {
    id: 'huangjie-media',
    name: '黄姐传媒',
    amount: 1038,
    sortOrder: 8,
  },
  {
    id: 'shuichan-market',
    name: '水产市场',
    amount: 100,
    sortOrder: 9,
  },
  {
    id: 'berton-ai',
    name: 'Berton AI',
    amount: 1040,
    sortOrder: 10,
    trailingLabel: '微信sonnenblu',
    trailingLabelVariant: 'plain',
  },
  {
    id: 'stain',
    name: 'stain',
    amount: 800,
    sortOrder: 11,
  },
  {
    id: 'xiaodengqun',
    name: '小登群',
    amount: 0.01,
    sortOrder: 12,
  },
];

export function getSponsorTitle(record: SponsorRecord, rank?: number): string {
  if (record.lockedTitle) {
    return record.lockedTitle;
  }

  if (rank === 1) {
    return '葬爱Web4万古至尊金主';
  }

  if (record.amount >= 1000) {
    return '葬爱Web4至高无上功德主';
  }

  if (record.amount >= 600) {
    return '葬爱Web4无上功德主';
  }

  if (record.amount >= 500) {
    return '葬爱Web4大功德主';
  }

  if (record.amount >= 200) {
    return '葬爱Web4护法金主';
  }

  return '葬爱Web4随喜功德主';
}

function resolveSponsorVisual(
  record: SponsorRecord,
  rank: number
): Pick<SponsorLeaderboardEntry, 'iconVariant' | 'themeVariant' | 'trailingLabel' | 'trailingLabelVariant' | 'isLegacyPatron'> {
  const title = getSponsorTitle(record, rank);
  const trailing = {
    trailingLabel: record.trailingLabel,
    trailingLabelVariant: record.trailingLabelVariant,
  };

  if (record.legacyVariant === 'primary') {
    return {
      iconVariant: 'legacy-primary',
      themeVariant: 'legacy-primary',
      ...trailing,
      isLegacyPatron: true,
    };
  }

  if (record.legacyVariant === 'secondary') {
    return {
      iconVariant: 'legacy-secondary',
      themeVariant: 'legacy-secondary',
      ...trailing,
      isLegacyPatron: true,
    };
  }

  if (rank === 1) {
    return {
      iconVariant: 'supreme-crown',
      themeVariant: 'supreme-gold',
      ...trailing,
      isLegacyPatron: false,
    };
  }

  if (title === '葬爱Web4至高无上功德主') {
    return {
      iconVariant: 'gem',
      themeVariant: 'top-gold',
      ...trailing,
      isLegacyPatron: record.trailingLabelVariant === 'badge',
    };
  }

  if (title === '葬爱Web4无上功德主') {
    return {
      iconVariant: 'triple-crown',
      themeVariant: 'high-gold',
      ...trailing,
      isLegacyPatron: false,
    };
  }

  if (title === '葬爱Web4大功德主') {
    return {
      iconVariant: 'double-crown',
      themeVariant: 'guardian',
      ...trailing,
      isLegacyPatron: false,
    };
  }

  if (title === '葬爱Web4护法金主') {
    return {
      iconVariant: 'single-crown',
      themeVariant: 'guardian',
      ...trailing,
      isLegacyPatron: false,
    };
  }

  return {
    iconVariant: 'single-crown',
    themeVariant: 'supporter',
    ...trailing,
    isLegacyPatron: false,
  };
}

export function buildSponsorLeaderboard(
  records: SponsorRecord[]
): SponsorLeaderboardEntry[] {
  return [...records]
    .sort((a, b) => b.amount - a.amount || a.sortOrder - b.sortOrder)
    .map((record, index) => {
      const rank = index + 1;
      const visual = resolveSponsorVisual(record, rank);

      return {
        id: record.id,
        rank,
        name: record.name,
        title: getSponsorTitle(record, rank),
        karma: `+${record.amount}`,
        amount: record.amount,
        ...visual,
      };
    });
}

export const SPONSORS_DATA = buildSponsorLeaderboard(SPONSOR_RECORDS);
