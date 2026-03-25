'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ArticleBodyProps {
  markdown: string;
}

export function ArticleBody({ markdown }: ArticleBodyProps) {
  return (
    <div className="article-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-8 mb-4 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-7 mb-3 text-foreground border-b border-border pb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mt-6 mb-2 text-foreground">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="my-3 leading-7 text-foreground/90">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="my-3 ml-6 list-disc space-y-1 text-foreground/90">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 ml-6 list-decimal space-y-1 text-foreground/90">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-primary/50 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <code className={`block bg-secondary/50 rounded p-4 my-4 overflow-x-auto text-sm font-mono text-foreground/90 ${className ?? ''}`}>
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-secondary/50 px-1.5 py-0.5 rounded text-sm font-mono text-primary">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto">{children}</pre>
          ),
          hr: () => (
            <hr className="my-6 border-border" />
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/80">{children}</em>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-secondary/30">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-border px-3 py-2 text-left font-bold text-foreground">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2 text-foreground/90">{children}</td>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt ?? ''} className="my-4 max-w-full rounded" />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
