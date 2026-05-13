'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  readonly className?: string;
  readonly iconClassName?: string;
  readonly textClassName?: string;
}

export function BrandLogo({ className, iconClassName, textClassName }: BrandLogoProps) {
  const gradientId = useId();

  return (
    <div
      role="img"
      aria-label="AI智慧课堂"
      className={cn('inline-flex items-center justify-center gap-3', className)}
    >
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className={cn('h-14 w-14 shrink-0', iconClassName)}
        fill="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="10" y1="8" x2="54" y2="56">
            <stop offset="0%" stopColor="#8B7BFF" />
            <stop offset="100%" stopColor="#5D7CFF" />
          </linearGradient>
        </defs>
        <path
          d="M32 5.5 54.5 18v28L32 58.5 9.5 46V18L32 5.5Z"
          stroke={`url(#${gradientId})`}
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        <path
          d="M24 18.5v27m0-27h10.4c5.7 0 9.1 2.9 9.1 7.3 0 3-1.6 5.2-4.7 6.4 4.1 1 6.3 3.6 6.3 7.4 0 4.9-3.8 8.4-10 8.4H24"
          stroke={`url(#${gradientId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 31.8h10.2m-10.2 13.7h11.7"
          stroke={`url(#${gradientId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>

      <span
        className={cn(
          'brand-gradient-text font-semibold tracking-tight whitespace-nowrap',
          textClassName,
        )}
      >
        AI智慧课堂
      </span>
    </div>
  );
}
