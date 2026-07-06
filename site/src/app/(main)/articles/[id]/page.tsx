import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllArticleIds, getArticle } from '@/lib/data';
import { ArticleBody } from '@/components/article/ArticleBody';
import { EntityTag } from '@/components/article/EntityTag';
import { Separator } from '@/components/ui/8bit/separator';
import { RELATION_STYLES } from '@/lib/constants';
import type { RelationType } from '@/lib/types';

export function generateStaticParams() {
  return getAllArticleIds().map((id) => ({ id }));
}

type ArticlePageParams = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: ArticlePageParams }): Promise<Metadata> {
  const { id } = await params;
  try {
    const article = getArticle(id);
    const description = article.excerpt
      ? article.excerpt.slice(0, 160)
      : `${article.author} - ${article.title}`;
    return {
      title: `${article.title} - 葬AI Web4`,
      description,
      openGraph: {
        title: article.title,
        description,
        type: 'article',
        publishedTime: article.date,
        authors: [article.author],
      },
    };
  } catch {
    return {
      title: '文章未找到 - 葬AI Web4',
    };
  }
}

export default async function ArticleDetailPage({ params }: { params: ArticlePageParams }) {
  const { id } = await params;
  let article;
  try {
    article = getArticle(id);
  } catch {
    notFound();
  }

  const hasGraphSummary = article.entities.length > 0 || article.relationships.length > 0;

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            datePublished: article.date,
            author: { '@type': 'Person', name: article.author },
            publisher: {
              '@type': 'Organization',
              name: '葬AI',
              logo: { '@type': 'ImageObject', url: 'https://funeralai.cc/logo.png' },
            },
            description: article.excerpt ? article.excerpt.slice(0, 160) : article.title,
            mainEntityOfPage: `https://funeralai.cc/articles/${id}/`,
            image: 'https://funeralai.cc/og-image.png',
            inLanguage: 'zh-CN',
          }),
        }}
      />
      <div className="mx-auto w-full max-w-3xl">
        {/* Back link */}
        <div className="mb-8">
          <Link
            href="/articles"
            className="retro text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            &larr; 返回文章列表
          </Link>
        </div>

        {/* Header */}
        <header className="mb-8">
          <h1 className="retro mb-4 text-balance text-[28px] leading-tight text-primary md:text-[36px]">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{article.date}</span>
            <span className="text-border">|</span>
            <span>{article.author}</span>
            {article.entity_count > 0 && (
              <>
                <span className="text-border">|</span>
                <span>{article.entity_count} 个实体</span>
              </>
            )}
            {article.relationship_count > 0 && (
              <>
                <span className="text-border">|</span>
                <span>{article.relationship_count} 条关系</span>
              </>
            )}
          </div>

          {hasGraphSummary && (
            <section className="mt-7 border border-border bg-card/60 p-5 md:p-6">
              <h2 className="retro mb-4 text-sm text-primary">知识图谱摘要</h2>

              {article.entities.length > 0 && (
                <details className="group border-t border-border py-4" open>
                  <summary className="retro cursor-pointer select-none text-xs text-foreground transition-colors hover:text-primary">
                    提及实体 ({article.entities.length})
                  </summary>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {article.entities.map((entity) => (
                      <EntityTag
                        key={entity.id}
                        id={entity.id}
                        name={entity.name}
                        type={entity.type}
                      />
                    ))}
                  </div>
                </details>
              )}

              {article.relationships.length > 0 && (
                <details className="group border-t border-border py-4">
                  <summary className="retro cursor-pointer select-none text-xs text-foreground transition-colors hover:text-primary">
                    关系 ({article.relationships.length})
                  </summary>
                  <div className="mt-4 grid gap-3">
                    {article.relationships.map((rel, i) => {
                      const style = RELATION_STYLES[rel.relation_type as RelationType];
                      return (
                        <div
                          key={`${rel.source}-${rel.target}-${i}`}
                          className="border border-border bg-background/35 p-3 text-xs leading-relaxed"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-foreground">{rel.source}</span>
                            <span
                              className="px-1.5 py-0.5 text-[10px]"
                              style={{
                                color: style?.color ?? '#94a3b8',
                                backgroundColor: `${style?.color ?? '#94a3b8'}20`,
                                border: `1px solid ${style?.color ?? '#94a3b8'}40`,
                              }}
                            >
                              {style?.label ?? rel.relation_type}
                            </span>
                            <span className="font-medium text-foreground">{rel.target}</span>
                          </div>
                          {rel.label && (
                            <p className="mt-2 border-l border-border pl-3 text-muted-foreground">
                              {rel.label}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </section>
          )}
        </header>

        <Separator className="mb-10" />

        <ArticleBody markdown={article.body_markdown} />
      </div>
    </article>
  );
}
