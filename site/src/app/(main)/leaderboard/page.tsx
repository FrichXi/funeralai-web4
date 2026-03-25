import type { Metadata } from 'next';
import { getLeaderboardData } from '@/lib/data';
import { LeaderboardPageClient } from '@/components/leaderboard/LeaderboardPageClient';
import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';

export const metadata: Metadata = {
  title: '排行榜 - 葬AI Web4',
  description: '中文AI行业排行榜。产品、创始人、投资机构与公司的综合排名。',
};

export default function LeaderboardPage() {
  const data = getLeaderboardData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: '排行榜 - 葬AI Web4',
            url: 'https://funeralai.cc/leaderboard/',
            mainEntity: {
              '@type': 'ItemList',
              name: '中文AI行业综合排行',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: '产品排行' },
                { '@type': 'ListItem', position: 2, name: '创始人排行' },
                { '@type': 'ListItem', position: 3, name: '投资机构排行' },
                { '@type': 'ListItem', position: 4, name: '公司排行' },
              ],
            },
          }),
        }}
      />
      <PageContainer>
        <LeaderboardPageClient data={data} />
      </PageContainer>
      <Footer />
    </>
  );
}
