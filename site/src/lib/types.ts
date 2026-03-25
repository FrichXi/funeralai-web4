// ── Graph types ──

export type NodeType = 'company' | 'person' | 'product' | 'vc_firm';

export interface SourceArticle {
  article_id: string;
  title: string;
  permalink: string;
  mention_count: number;
}

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  mention_count: number;
  article_count: number;
  aliases: string[];
  tags: string[];
  references: number;
  source_article_count: number;
  source_articles: SourceArticle[];
  degree: number;
  displayName?: string;
  visualMode?: string;
  asset?: NodeAsset;
  featured?: boolean;
  sizeBoost?: number;
  composite_weight?: number;
  leaderboardSegments?: string[];
  hiddenFromLeaderboards?: boolean;
}

export interface NodeAsset {
  src: string;
  alt: string;
  localAssetPath: string;
}

export interface GraphLink {
  source: string;
  target: string;
  relation_type: RelationType;
  type: string;
  label: string;
  weight: number;
  strength: number;
  effective_weight: number;
  article_count: number;
  evidence_articles: string[];
  evidences: Evidence[];
}

export interface Evidence {
  article_id: string;
  title: string;
  permalink: string;
  markdown_link: string;
  path: string;
  label?: string;
  weight?: number;
  quote?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  metadata?: Record<string, unknown>;
}

// ── Relation types ──

export type RelationType =
  | 'acquires'
  | 'co_founded'
  | 'collaborates_with'
  | 'compares_to'
  | 'competes_with'
  | 'criticizes'
  | 'develops'
  | 'founder_of'
  | 'integrates_with'
  | 'invests_in'
  | 'mentors'
  | 'partners_with'
  | 'praises'
  | 'related'
  | 'works_at'
  | 'works_on';

// ── Article types ──

export interface ArticleIndex {
  generatedAt: string;
  count: number;
  isPartial: boolean;
  missingArticleIds: string[];
  articles: ArticleSummary[];
}

export interface ArticleSummary {
  id: string;
  title: string;
  date: string;
  author: string;
  path: string;
  permalink: string;
  markdown_link: string;
  excerpt: string;
  entity_count: number;
  relationship_count: number;
}

export interface Article extends ArticleSummary {
  raw_markdown: string;
  body_markdown: string;
  entities: ArticleEntity[];
  relationships: ArticleRelationship[];
}

export interface ArticleEntity {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  mention_count: number;
  aliases: string[];
  tags: string[];
}

export interface ArticleRelationship {
  source_id: string;
  target_id: string;
  source: string;
  target: string;
  relation_type: RelationType;
  label: string;
  weight: number;
}

// ── Leaderboard types ──

export interface LeaderboardData {
  generatedAt: string;
  segments: {
    products: LeaderboardEntry[];
    founders: LeaderboardEntry[];
    vcs: LeaderboardEntry[];
    companies: LeaderboardEntry[];
  };
}

export type LeaderboardSegment = keyof LeaderboardData['segments'];

export interface LeaderboardEntry {
  rank: number;
  nodeId: string;
  name: string;
  displayName: string;
  type: string;
  degree: number;
  mention_count: number;
  article_count: number;
  composite_weight?: number;
  visualMode?: string;
  asset?: NodeAsset;
  featured?: boolean;
  sizeBoost?: number;
}

// ── Display Registry ──

export interface DisplayRegistry {
  version: number;
  updatedAt: string;
  defaults: { leaderboardSize: number };
  presentation: Record<string, unknown>;
  nodes: DisplayNodeConfig[];
}

export interface DisplayNodeConfig {
  nodeId?: string;
  sizeBoost?: number;
  visualMode?: string;
  featured?: boolean;
  asset?: NodeAsset;
}
