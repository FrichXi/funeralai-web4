import type { Metadata } from 'next';
import { getArticleIndex } from '@/lib/data';
import { ArticleList } from '@/components/article/ArticleList';

export const metadata: Metadata = {
  title: '文章 - 葬AI Web4',
  description: '收录来自「葬AI」的全部评论文章，涵盖AI行业公司、产品与人物深度分析。',
};

export default function ArticlesPage() {
  const index = getArticleIndex();

  // Sort by date descending
  const sorted = [...index.articles].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: '文章 - 葬AI Web4',
            description: '收录来自「葬AI」的全部评论文章，涵盖AI行业公司、产品与人物深度分析。',
            url: 'https://funeralai.cc/articles/',
            inLanguage: 'zh-CN',
          }),
        }}
      />
      <div className="mb-8">
        <h1 className="retro text-[24px] text-primary mb-2">文章</h1>
        <p className="text-sm text-muted-foreground">
          共收录 {index.count} 篇来自「葬AI」的评论文章，涵盖 AI 行业公司、产品与人物分析。
        </p>
      </div>
      <ArticleList articles={sorted} />
    </section>
  );
}
