import type { ArticleIndex, Article, GraphData, LeaderboardData } from './types';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

function readJSON<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

export function getArticleIndex(): ArticleIndex {
  return readJSON<ArticleIndex>(path.join(DATA_DIR, 'article-index.json'));
}

export function getArticle(id: string): Article {
  return readJSON<Article>(path.join(DATA_DIR, 'articles', `${id}.json`));
}

export function getAllArticleIds(): string[] {
  const index = getArticleIndex();
  return index.articles.map(a => a.id);
}

export function getGraphData(): GraphData {
  return readJSON<GraphData>(path.join(DATA_DIR, 'graph-view.json'));
}

export function getLeaderboardData(): LeaderboardData {
  return readJSON<LeaderboardData>(path.join(DATA_DIR, 'leaderboards.json'));
}

// Stats for homepage
export function getSiteStats() {
  const index = getArticleIndex();
  const graph = getGraphData();
  const lastArticle = index.articles[index.articles.length - 1];
  return {
    articleCount: index.count,
    nodeCount: graph.nodes.length,
    linkCount: graph.links.length,
    companyCount: graph.nodes.filter(n => n.type === 'company').length,
    productCount: graph.nodes.filter(n => n.type === 'product').length,
    personCount: graph.nodes.filter(n => n.type === 'person').length,
    lastArticleId: lastArticle.id,
    lastArticleTitle: lastArticle.title,
    lastArticleDate: lastArticle.date,
  };
}
