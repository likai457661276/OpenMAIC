export interface FeatureFlags {
  teacherExtension: boolean;
  lessonGeneration: boolean;
  slideGeneration: boolean;
  richCourseware: boolean;
  quizGeneration: boolean;
  pblGeneration: boolean;
  realtimeAnswer: boolean;
  onlineScoring: boolean;
  classroomFeedback: boolean;
  pptxExport: boolean;
  whiteboard: boolean;
  voiceNarration: boolean;
  voicePlayback: boolean;
  followPresenter: boolean;
  complexRealtimePlayback: boolean;
}

export type FeatureFlagKey = keyof FeatureFlags;

export type FeatureFlagEnvironment = 'development' | 'staging' | 'production' | 'test';

export const DEFAULT_TEACHER_MODE_FLAGS: FeatureFlags = {
  teacherExtension: true,
  lessonGeneration: true,
  slideGeneration: true,
  richCourseware: true,
  quizGeneration: true,
  pblGeneration: true,
  realtimeAnswer: true,
  onlineScoring: true,
  classroomFeedback: true,
  pptxExport: true,
  whiteboard: false,
  voiceNarration: false,
  voicePlayback: false,
  followPresenter: false,
  complexRealtimePlayback: false,
};

export const DEFAULT_FEATURE_FLAGS_BY_ENV: Record<FeatureFlagEnvironment, FeatureFlags> = {
  development: DEFAULT_TEACHER_MODE_FLAGS,
  staging: DEFAULT_TEACHER_MODE_FLAGS,
  production: DEFAULT_TEACHER_MODE_FLAGS,
  test: DEFAULT_TEACHER_MODE_FLAGS,
};

export const FEATURE_FLAG_ENV_NAMES: Record<FeatureFlagKey, string> = {
  teacherExtension: 'FEATURE_TEACHER_EXTENSION',
  lessonGeneration: 'FEATURE_LESSON_GENERATION',
  slideGeneration: 'FEATURE_SLIDE_GENERATION',
  richCourseware: 'FEATURE_RICH_COURSEWARE',
  quizGeneration: 'FEATURE_QUIZ_GENERATION',
  pblGeneration: 'FEATURE_PBL_GENERATION',
  realtimeAnswer: 'FEATURE_REALTIME_ANSWER',
  onlineScoring: 'FEATURE_ONLINE_SCORING',
  classroomFeedback: 'FEATURE_CLASSROOM_FEEDBACK',
  pptxExport: 'FEATURE_PPTX_EXPORT',
  whiteboard: 'FEATURE_WHITEBOARD',
  voiceNarration: 'FEATURE_VOICE_NARRATION',
  voicePlayback: 'FEATURE_VOICE_PLAYBACK',
  followPresenter: 'FEATURE_FOLLOW_PRESENTER',
  complexRealtimePlayback: 'FEATURE_COMPLEX_REALTIME_PLAYBACK',
};

export const PUBLIC_FEATURE_FLAG_ENV_NAMES: Record<FeatureFlagKey, string> = {
  teacherExtension: 'NEXT_PUBLIC_FEATURE_TEACHER_EXTENSION',
  lessonGeneration: 'NEXT_PUBLIC_FEATURE_LESSON_GENERATION',
  slideGeneration: 'NEXT_PUBLIC_FEATURE_SLIDE_GENERATION',
  richCourseware: 'NEXT_PUBLIC_FEATURE_RICH_COURSEWARE',
  quizGeneration: 'NEXT_PUBLIC_FEATURE_QUIZ_GENERATION',
  pblGeneration: 'NEXT_PUBLIC_FEATURE_PBL_GENERATION',
  realtimeAnswer: 'NEXT_PUBLIC_FEATURE_REALTIME_ANSWER',
  onlineScoring: 'NEXT_PUBLIC_FEATURE_ONLINE_SCORING',
  classroomFeedback: 'NEXT_PUBLIC_FEATURE_CLASSROOM_FEEDBACK',
  pptxExport: 'NEXT_PUBLIC_FEATURE_PPTX_EXPORT',
  whiteboard: 'NEXT_PUBLIC_FEATURE_WHITEBOARD',
  voiceNarration: 'NEXT_PUBLIC_FEATURE_VOICE_NARRATION',
  voicePlayback: 'NEXT_PUBLIC_FEATURE_VOICE_PLAYBACK',
  followPresenter: 'NEXT_PUBLIC_FEATURE_FOLLOW_PRESENTER',
  complexRealtimePlayback: 'NEXT_PUBLIC_FEATURE_COMPLEX_REALTIME_PLAYBACK',
};

export const FEATURE_FLAG_KEYS = Object.keys(DEFAULT_TEACHER_MODE_FLAGS) as FeatureFlagKey[];
