'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ArticleBodyProps {
  markdown: string;
}

export function ArticleBody({ markdown }: ArticleBodyProps) {
  return (
    <div className="article-prose prose prose-base md:prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary/80 hover:decoration-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <code className={`block overflow-x-auto border border-border bg-secondary/60 p-4 text-sm font-mono text-foreground/90 ${className ?? ''}`}>
                  {children}
                </code>
              );
            }
            return (
              <code className="border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[0.88em] font-mono text-primary before:content-none after:content-none">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-6 overflow-x-auto rounded-none border border-border bg-secondary/40 p-0 shadow-none">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-8 overflow-x-auto border border-border bg-card/40">
              <table className="my-0 w-full min-w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-secondary/40">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-border px-3 py-2 text-left font-bold text-foreground">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2 text-foreground/90">{children}</td>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt ?? ''}
              className="mx-auto my-8 max-w-full rounded-none border border-border bg-secondary/30"
            />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
