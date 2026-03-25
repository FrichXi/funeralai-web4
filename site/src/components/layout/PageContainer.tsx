import type * as React from 'react';
import { cn } from '@/lib/utils';

export function PageContainer({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('mx-auto max-w-7xl px-4 py-6', className)}
      {...props}
    />
  );
}
