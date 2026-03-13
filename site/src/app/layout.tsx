import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { cn } from '@/lib/utils';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: '@葬AI - AI行业知识图谱',
  description: '中文AI行业评论媒体「葬AI」的知识图谱分析站点。472个实体、701条关系，覆盖公司、产品、人物。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={cn(geistSans.variable, geistMono.variable)}>
      <body className="min-h-screen antialiased font-sans">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
