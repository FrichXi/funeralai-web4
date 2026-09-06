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
  description?: string;
  mention_count: number;
  article_count: number;
  aliases: string[];
  tags?: string[];
  references?: number;
  source_article_count?: number;
  source_articles?: SourceArticle[];
  degree: number;
  displayName?: string;
  visualMode?: string;
  asset?: NodeAsset;
  featured?: boolean;
  sizeBoost?: number;
  composite_weight?: number;
  leaderboardSegments?: string[];
  hiddenFromLeaderboards?: boolean;
  community_id?: string;
  community_name?: string;
  community_color?: string;
  x?: number;
  y?: number;
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
  type?: string;
  label?: string;
  weight: number;
  strength?: number;
  effective_weight?: number;
  article_count?: number;
  evidence_articles?: string[];
  evidences?: Evidence[];
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

export interface SuggestedEdge {
  source: string;
  target: string;
  score: number;
  suggested_relation_type: RelationType;
  reason: string;
  evidence_article_ids: string[];
  status: 'suggested';
}

export interface EntityDetails {
  node: GraphNode;
  links: GraphLink[];
  suggested_edges: SuggestedEdge[];
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

export interface SponsorRecord {
  id: string;
  name: string;
  amount: number;
  sortOrder: number;
  lockedTitle?: string;
  trailingLabel?: string;
  trailingLabelVariant?: SponsorTrailingVariant;
  legacyVariant?: 'primary' | 'secondary';
}

export type SponsorTrailingVariant = 'badge' | 'plain';

export type SponsorIconVariant =
  | 'supreme-crown'
  | 'gem'
  | 'triple-crown'
  | 'legacy-primary'
  | 'legacy-secondary'
  | 'double-crown'
  | 'single-crown';

export type SponsorThemeVariant =
  | 'supreme-gold'
  | 'top-gold'
  | 'high-gold'
  | 'legacy-primary'
  | 'legacy-secondary'
  | 'guardian'
  | 'supporter';

export interface SponsorLeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  title: string;
  karma: string;
  amount: number;
  iconVariant: SponsorIconVariant;
  themeVariant: SponsorThemeVariant;
  trailingLabel?: string;
  trailingLabelVariant?: SponsorTrailingVariant;
  isLegacyPatron: boolean;
}
