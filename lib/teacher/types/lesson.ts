export type LessonStatus = 'draft' | 'generated' | 'edited' | 'finalized';

export interface TeachingPhase {
  name: string;
  duration: number;
  teacherActivity: string;
  studentActivity: string;
  designIntent: string;
  resources?: string[];
}

export interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  grade: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
  status: LessonStatus;
  objectives: string[];
  keyPoints: string[];
  difficulties: string[];
  teachingProcess: TeachingPhase[];
  homework: string;
  reflection: string;
  style?: string;
  additionalRequirements?: string;
  sourceJobId?: string;
  sourceClassroomId?: string;
}

export interface CreateLessonInput {
  subject: string;
  grade: string;
  topic: string;
  objectives?: string[];
  duration?: number;
  style?: string;
  additionalRequirements?: string;
  enableWebSearch?: boolean;
  enableImageGeneration?: boolean;
  enableVideoGeneration?: boolean;
}

export type UpdateLessonInput = Partial<
  Pick<
    LessonPlan,
    | 'title'
    | 'subject'
    | 'grade'
    | 'duration'
    | 'status'
    | 'objectives'
    | 'keyPoints'
    | 'difficulties'
    | 'teachingProcess'
    | 'homework'
    | 'reflection'
    | 'style'
    | 'additionalRequirements'
    | 'sourceJobId'
    | 'sourceClassroomId'
  >
>;
