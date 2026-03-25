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

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  try {
    const article = getArticle(params.id);
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

export default function ArticleDetailPage({ params }: { params: { id: string } }) {
  let article;
  try {
    article = getArticle(params.id);
  } catch {
    notFound();
  }

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
            mainEntityOfPage: `https://funeralai.cc/articles/${params.id}/`,
            image: 'https://funeralai.cc/og-image.png',
            inLanguage: 'zh-CN',
          }),
        }}
      />
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/articles"
          className="retro text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          &larr; 返回文章列表
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8">
        <h1 className="retro text-[24px] text-primary mb-3 leading-relaxed">
          {article.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
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
      </header>

      <Separator className="mb-8" />

      {/* Main content + sidebar layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Article body */}
        <div className="flex-1 min-w-0">
          <ArticleBody markdown={article.body_markdown} />
        </div>

        {/* Sidebar: entities & relationships */}
        {(article.entities.length > 0 || article.relationships.length > 0) && (
          <aside className="lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-20 space-y-6">
              {/* Entities */}
              {article.entities.length > 0 && (
                <div className="border border-border rounded-sm p-4 bg-card">
                  <h3 className="retro text-xs text-primary mb-3">
                    提及实体 ({article.entities.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {article.entities.map((entity) => (
                      <EntityTag
                        key={entity.id}
                        id={entity.id}
                        name={entity.name}
                        type={entity.type}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Relationships */}
              {article.relationships.length > 0 && (
                <div className="border border-border rounded-sm p-4 bg-card">
                  <h3 className="retro text-xs text-primary mb-3">
                    关系 ({article.relationships.length})
                  </h3>
                  <div className="space-y-3">
                    {article.relationships.map((rel, i) => {
                      const style = RELATION_STYLES[rel.relation_type as RelationType];
                      return (
                        <div
                          key={`${rel.source}-${rel.target}-${i}`}
                          className="text-xs leading-relaxed"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-foreground font-medium">{rel.source}</span>
                            <span
                              className="px-1.5 py-0.5 rounded-sm text-[10px]"
                              style={{
                                color: style?.color ?? '#94a3b8',
                                backgroundColor: `${style?.color ?? '#94a3b8'}20`,
                                border: `1px solid ${style?.color ?? '#94a3b8'}40`,
                              }}
                            >
                              {style?.label ?? rel.relation_type}
                            </span>
                            <span className="text-foreground font-medium">{rel.target}</span>
                          </div>
                          {rel.label && (
                            <p className="text-muted-foreground mt-1 pl-2 border-l border-border">
                              {rel.label}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </article>
  );
}
