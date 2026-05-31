'use client';

import { createContext, useContext, useEffect } from 'react';
import { useFeatureFlag } from '@/lib/hooks/use-feature-flag';
import { useSettingsStore } from '@/lib/store/settings';

interface TeacherModeContextValue {
  isTeacherMode: boolean;
}

const TeacherModeContext = createContext<TeacherModeContextValue>({ isTeacherMode: false });

export function TeacherModeProvider({ children }: { children: React.ReactNode }) {
  const voiceNarrationEnabled = useFeatureFlag('voiceNarration');
  const voicePlaybackEnabled = useFeatureFlag('voicePlayback');

  useEffect(() => {
    const settings = useSettingsStore.getState();
    if (!voiceNarrationEnabled) {
      settings.setTTSEnabled(false);
    }
    if (!voicePlaybackEnabled) {
      settings.setASREnabled(false);
    }
  }, [voiceNarrationEnabled, voicePlaybackEnabled]);

  return (
    <TeacherModeContext.Provider value={{ isTeacherMode: true }}>
      {children}
    </TeacherModeContext.Provider>
  );
}

export function useTeacherMode(): TeacherModeContextValue {
  return useContext(TeacherModeContext);
}
