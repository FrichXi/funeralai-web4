import type { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://funeralai.cc';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/graph`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/leaderboard`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/articles`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Article pages — read article-index.json at build time
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const indexPath = path.join(process.cwd(), '..', 'web-data', 'article-index.json');
    const raw = fs.readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(raw) as {
      articles: Array<{ id: string; date: string }>;
    };

    articlePages = index.articles.map((article) => ({
      url: `${baseUrl}/articles/${article.id}`,
      lastModified: article.date,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch {
    // Fallback: try reading from public/data
    try {
      const fallbackPath = path.join(process.cwd(), 'public', 'data', 'article-index.json');
      const raw = fs.readFileSync(fallbackPath, 'utf-8');
      const index = JSON.parse(raw) as {
        articles: Array<{ id: string; date: string }>;
      };

      articlePages = index.articles.map((article) => ({
        url: `${baseUrl}/articles/${article.id}`,
        lastModified: article.date,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
    } catch {
      // No article index available at build time
    }
  }

  return [...staticPages, ...articlePages];
}
