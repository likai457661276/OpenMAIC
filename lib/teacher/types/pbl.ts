export type PBLStatus = 'draft' | 'ready' | 'active' | 'completed';

export interface PBLProject {
  id: string;
  lessonId: string;
  title: string;
  background: string;
  drivingQuestion: string;
  objectives: string[];
  tasks: PBLTask[];
  timeline: PBLPhase[];
  teacherGuidance: string;
  studentDeliverables: string[];
  evaluationCriteria: EvaluationRubric;
  resources: string[];
  createdAt: string;
  updatedAt: string;
  status: PBLStatus;
}

export interface PBLTask {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'individual' | 'group';
  duration: string;
  expectedOutcome: string;
}

export interface PBLPhase {
  id: string;
  order: number;
  name: string;
  duration: string;
  activities: string[];
  milestones: string[];
}

export interface EvaluationRubric {
  dimensions: RubricDimension[];
  totalScore: number;
}

export interface RubricDimension {
  name: string;
  weight: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  level: string;
  score: number;
  description: string;
}

export interface PBLGenerationInput {
  lessonId: string;
  topic?: string;
  issueCount?: number;
  targetSkills?: string[];
}

export type PBLProjectUpdateInput = Partial<
  Pick<
    PBLProject,
    | 'title'
    | 'background'
    | 'drivingQuestion'
    | 'objectives'
    | 'tasks'
    | 'timeline'
    | 'teacherGuidance'
    | 'studentDeliverables'
    | 'evaluationCriteria'
    | 'resources'
    | 'status'
  >
>;
