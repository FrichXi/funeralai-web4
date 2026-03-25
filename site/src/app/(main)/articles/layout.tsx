import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';

export default function ArticlesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageContainer>{children}</PageContainer>
      <Footer />
    </>
  );
}
