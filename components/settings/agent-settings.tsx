'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Info } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';

interface Agent {
  id: string;
  name: string;
  avatar: string;
  role: string;
  priority: number;
  allowedActions: string[];
}

interface AgentSettingsProps {
  agents: Agent[];
  selectedAgentIds: string[];
  maxTurns: string;
  agentMode: 'preset' | 'auto';
  onToggleAgent: (_agentId: string) => void;
  onMaxTurnsChange: (value: string) => void;
  onAgentModeChange: (_mode: 'preset' | 'auto') => void;
}

export function AgentSettings({
  agents: _agents,
  selectedAgentIds: _selectedAgentIds,
  maxTurns,
  agentMode: _agentMode,
  onToggleAgent: _onToggleAgent,
  onMaxTurnsChange,
  onAgentModeChange: _onAgentModeChange,
}: AgentSettingsProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('settings.agentMode')}</Label>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-sm">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{t('settings.agentModeAutoDesc')}</span>
        </div>

        <div className="space-y-2 border-l-4 border-purple-500 pl-4">
          <Label>{t('settings.maxTurns')}</Label>
          <p className="text-xs text-muted-foreground">{t('settings.maxTurnsDesc')}</p>
          <Input
            type="number"
            min="1"
            max="20"
            value={maxTurns}
            onChange={(e) => onMaxTurnsChange(e.target.value)}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
}
