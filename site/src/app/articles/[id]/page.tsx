import { getAllArticleIds } from '@/lib/data';

export function generateStaticParams() {
  return getAllArticleIds().map((id) => ({ id }));
}

// Stub — will be built by Agent A (Articles)
export default function ArticleDetailPage({ params }: { params: { id: string } }) {
  return <div className="py-20 text-center retro text-sm text-muted-foreground">Article {params.id} loading...</div>;
}
