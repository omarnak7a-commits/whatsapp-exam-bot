export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: bool;
  created_at: string;
}

export interface Option {
  id?: number;
  option_text: string;
  is_correct: boolean;
  order_index?: number;
}

export interface Question {
  id: number;
  exam_id: number;
  question_text: string;
  order_index: number;
  created_at: string;
  options: Option[];
}

export interface Exam {
  id: number;
  title: string;
  description?: string;
  duration_seconds: number;
  status: ExamStatus;
  number_of_questions: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  one_attempt_only: boolean;
  show_correct_answer_immediately: boolean;
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
  whatsapp_number: string;
  is_active: boolean;
  created_at: string;
  total_attempts?: number;
  average_score?: number;
  best_score?: number;
}

export interface AttemptResult {
  id: number;
  exam_id: number;
  exam_title: string;
  student_id: number;
  student_name: string;
  student_whatsapp: string;
  started_at: string;
  finished_at?: string;
  expires_at: string;
  status: AttemptStatus;
  score: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  percentage: number;
  completion_seconds: number;
  final_rank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  student_name: string;
  whatsapp_number: string;
  score: number;
  total_questions: number;
  percentage: number;
  completion_seconds: number;
  finished_at: string;
}

export interface DashboardStats {
  total_exams: number;
  published_exams: number;
  total_students: number;
  total_completed_attempts: number;
  average_score_percentage: number;
  highest_score_percentage: number;
}
