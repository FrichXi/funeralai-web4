import type * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function CenteredScreen({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center bg-background px-4',
        className
      )}
      {...props}
    />
  );
}

type StatusAction =
  | {
      label: string;
      href: string;
      variant: 'primary' | 'secondary';
    }
  | {
      label: string;
      onClick: () => void;
      variant: 'primary' | 'secondary';
    };

interface StatusScreenProps {
  title: string;
  message: string;
  actions: StatusAction[];
}

function actionClass(variant: StatusAction['variant']) {
  return variant === 'primary'
    ? 'px-4 py-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
    : 'px-4 py-2 text-xs text-foreground border border-border hover:border-primary hover:text-primary transition-colors';
}

export function StatusScreen({
  title,
  message,
  actions,
}: StatusScreenProps) {
  return (
    <CenteredScreen>
      <h1 className="text-[64px] text-primary drop-shadow-brand">{title}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      <div className="mt-8 flex gap-4">
        {actions.map((action) => {
          const className = actionClass(action.variant);
          if ('href' in action) {
            return (
              <Link key={`${action.variant}-${action.label}`} href={action.href} className={className}>
                {action.label}
              </Link>
            );
          }

          return (
            <button
              key={`${action.variant}-${action.label}`}
              onClick={action.onClick}
              className={className}
            >
              {action.label}
            </button>
          );
        })}
      </div>
    </CenteredScreen>
  );
}
