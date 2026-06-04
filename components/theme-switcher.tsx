'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useTheme } from '@/lib/hooks/use-theme';
import { cn } from '@/lib/utils';

interface ThemeSwitcherProps {
  readonly className?: string;
  readonly iconClassName?: string;
  readonly contentClassName?: string;
  readonly ariaLabel?: string;
}

export function ThemeSwitcher({
  className,
  iconClassName = 'w-4 h-4',
  contentClassName,
  ariaLabel,
}: ThemeSwitcherProps) {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();

  const buttonLabel = ariaLabel ?? t('settings.theme');
  const activeClass = 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 hover:shadow-sm transition-all',
            className,
          )}
          aria-label={buttonLabel}
          title={buttonLabel}
        >
          {theme === 'light' && <Sun className={iconClassName} />}
          {theme === 'dark' && <Moon className={iconClassName} />}
          {theme === 'system' && <Monitor className={iconClassName} />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn('z-[1000] min-w-[140px]', contentClassName)}
      >
        <DropdownMenuItem
          onSelect={() => setTheme('light')}
          className={cn('cursor-pointer gap-2', theme === 'light' && activeClass)}
        >
          <Sun className={iconClassName} />
          {t('settings.themeOptions.light')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setTheme('dark')}
          className={cn('cursor-pointer gap-2', theme === 'dark' && activeClass)}
        >
          <Moon className={iconClassName} />
          {t('settings.themeOptions.dark')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setTheme('system')}
          className={cn('cursor-pointer gap-2', theme === 'system' && activeClass)}
        >
          <Monitor className={iconClassName} />
          {t('settings.themeOptions.system')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
