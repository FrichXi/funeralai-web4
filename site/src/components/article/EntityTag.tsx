'use client';

import Link from 'next/link';
import { NODE_COLORS, NODE_TYPE_LABELS } from '@/lib/constants';
import type { NodeType } from '@/lib/types';

interface EntityTagProps {
  id: string;
  name: string;
  type: NodeType;
  className?: string;
}

export function EntityTag({ id, name, type, className = '' }: EntityTagProps) {
  const color = NODE_COLORS[type] ?? '#7351cf';
  const typeLabel = NODE_TYPE_LABELS[type] ?? type;

  return (
    <Link
      href={`/graph?focus=${encodeURIComponent(id)}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-sm border transition-colors hover:brightness-125 ${className}`}
      style={{
        borderColor: color,
        color: color,
        backgroundColor: `${color}18`,
      }}
      title={`${typeLabel}: ${name}`}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="truncate max-w-[160px]">{name}</span>
    </Link>
  );
}
