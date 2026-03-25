'use client';

import { useEffect } from 'react';
import { StatusScreen } from '@/components/layout/StatusScreen';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[葬AI] Root error:', error);
  }, [error]);

  return (
    <StatusScreen
      title="ERR"
      message="出了点问题"
      actions={[
        { label: '重试', onClick: reset, variant: 'primary' },
        { label: '返回首页', href: '/', variant: 'secondary' },
      ]}
    />
  );
}
