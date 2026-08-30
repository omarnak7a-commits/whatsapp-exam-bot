export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Option {
  id: number;
  question_id?: number;
  text: string;
  is_correct: boolean;
  order_index: number;
}

export interface Question {
  id: number;
  exam_id: number;
  text: string;
  order_index: number;
  points: number;
  question_type?: 'multiple_choice' | 'true_false';
  created_at: string;
  options: Option[];
}

export interface Exam {
  id: number;
  title: string;
  description?: string;
  public_slug?: string;
  duration_minutes: number;
  duration_seconds: number;
  status: ExamStatus;
  instant_feedback_enabled: boolean;
  show_correct_answers: boolean;
  leaderboard_enabled: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string;
  closed_at?: string;
  total_questions_count?: number;
  total_attempts_count?: number;
}

export interface ExamDetail extends Exam {
  questions: Question[];
}

export interface Student {
  id: number;
  name: string;
  total_attempts: number;
  average_percentage: number;
  best_percentage: number;
  exams_count: number;
  last_attempt_at?: string;
}

export interface AttemptResult {
  id: number;
  exam_id: number;
  exam_title: string;
  student_id: number;
  student_name: string;
  started_at: string;
  submitted_at?: string;
  finished_at?: string;
  expires_at: string;
  status: AttemptStatus;
  score: number;
  total_score: number;
  percentage: number;
  completion_time_seconds: number;
  ranking?: number;
}

export interface LeaderboardEntry {
  rank: number;
  student_name: string;
  score: number;
  total_score: number;
  percentage: number;
  completion_time_seconds: number;
  submitted_at?: string;
}

export interface DashboardStats {
  total_exams: number;
  published_exams: number;
  total_students: number;
  total_completed_attempts: number;
  average_score_percentage: number;
  highest_score_percentage: number;
}
