import { StatusScreen } from '@/components/layout/StatusScreen';

export default function NotFound() {
  return (
    <StatusScreen
      title="404"
      message="页面不存在"
      actions={[
        { label: '返回首页', href: '/', variant: 'primary' },
        { label: '探索图谱', href: '/graph', variant: 'secondary' },
      ]}
    />
  );
}
