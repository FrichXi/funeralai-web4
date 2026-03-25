import type { Metadata } from 'next';
import { getLeaderboardData, getSiteStats } from '@/lib/data';
import { GraphClient } from './GraphClient';

export const metadata: Metadata = {
  title: '知识图谱 - 葬AI Web4',
  description: '中文AI行业知识图谱可视化。探索公司、产品、人物与投资机构之间的关系网络。',
};

export default function GraphPage() {
  const leaderboard = getLeaderboardData();
  const stats = getSiteStats();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: '中文AI行业知识图谱',
            description: `基于${stats.articleCount}篇文章，${stats.nodeCount}个实体，${stats.linkCount}条关系的中文AI行业知识图谱。`,
            url: 'https://funeralai.cc/graph/',
            creator: { '@type': 'Organization', name: '葬AI' },
            inLanguage: 'zh-CN',
            keywords: ['AI', '知识图谱', '中文AI行业', '关系网络'],
          }),
        }}
      />
      <GraphClient
        leaderboard={leaderboard}
        stats={{
          articleCount: stats.articleCount,
          nodeCount: stats.nodeCount,
          linkCount: stats.linkCount,
        }}
      />
    </>
  );
}
