'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ArticleSummary } from '@/lib/types';
import { Input } from '@/components/ui/8bit/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/8bit/card';
import { Badge } from '@/components/ui/8bit/badge';

interface ArticleListProps {
  articles: ArticleSummary[];
}

export function ArticleList({ articles }: ArticleListProps) {
  const [query, setQuery] = useState('');

  const filtered = articles.filter((a) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.author.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Search */}
      <div className="mb-8 max-w-md">
        <Input
          placeholder="搜索文章标题、作者..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-4 retro">
        {filtered.length === articles.length
          ? `共 ${articles.length} 篇文章`
          : `找到 ${filtered.length} / ${articles.length} 篇`}
      </p>

      {/* Article grid */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="retro text-xs text-muted-foreground">
            没有找到匹配的文章
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.id}`}
              className="block group"
            >
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader>
                  <CardDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap font-sans">
                    <span>{article.date}</span>
                    <span className="text-border">|</span>
                    <span>{article.author}</span>
                  </CardDescription>
                  <CardTitle className="text-sm leading-relaxed group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="font-sans">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {article.excerpt}
                  </p>
                </CardContent>
                <CardFooter className="flex items-center gap-2 flex-wrap">
                  {article.entity_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {article.entity_count} 实体
                    </Badge>
                  )}
                  {article.relationship_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {article.relationship_count} 关系
                    </Badge>
                  )}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
