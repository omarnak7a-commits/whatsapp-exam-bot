import { createContext, useContext, useState, useCallback } from 'react'
import { apiFetch, publicFetch } from '../api/client'

export type ExamStatus = 'draft' | 'published' | 'closed'
export type QuestionType = 'multiple_choice' | 'true_false'
export type AttemptStatus = 'in_progress' | 'completed' | 'expired'

export interface Exam {
  id: string
  title: string
  description: string
  slug: string
  status: ExamStatus
  durationMinutes: number
  instantFeedback: boolean
  showCorrectAnswers: boolean
  leaderboardEnabled: boolean
  createdAt: string
  publishedAt?: string
  closedAt?: string
  /** Real counts provided by the API (total_questions_count / total_attempts_count). */
  questionCount: number
  attemptCount: number
}

export interface Option {
  id: string
  questionId: string
  text: string
  isCorrect: boolean
  orderIndex: number
}

export interface Question {
  id: string
  examId: string
  text: string
  type: QuestionType
  orderIndex: number
  options: Option[]
}

export interface Attempt {
  id: string
  examId: string
  examTitle: string
  studentName: string
  startedAt: string
  completedAt?: string
  score: number
  totalQuestions: number
  percentage: number
  completionTimeSeconds: number
  status: AttemptStatus
}

export interface Student {
  id: string
  name: string
  totalAttempts: number
  averagePercentage: number
  bestPercentage: number
  examsCount: number
  lastAttemptAt?: string
}

export interface DashboardStats {
  totalExams: number
  publishedExams: number
  totalStudents: number
  totalCompletedAttempts: number
  averageScorePercentage: number
}

export interface ResultAnswerDetail {
  questionText: string
  selectedOptionText?: string
  correctOptionText?: string
  isCorrect: boolean
}

export interface AdminAttemptDetail {
  id: string
  examId: string
  examTitle: string
  studentName: string
  status: AttemptStatus
  score: number
  totalQuestions: number
  percentage: number
  completionTimeSeconds: number
  answers: ResultAnswerDetail[]
}

/** Public (student-side) shapes — options never carry correctness. */
export interface PublicExamInfo {
  slug: string
  title: string
  description: string
  status: ExamStatus
  durationMinutes: number
  questionsCount: number
  instantFeedback: boolean
  showCorrectAnswers: boolean
  leaderboardEnabled: boolean
}

export interface PublicOption {
  id: string
  text: string
  orderIndex: number
}

export interface PublicQuestion {
  id: string
  text: string
  orderIndex: number
  points: number
  options: PublicOption[]
  selectedOptionId?: string | null
}

export interface PublicAttemptBundle {
  attempt: {
    id: string
    examId: string
    studentName: string
    startedAt: string
    status: string
    remainingSeconds: number
    totalQuestions: number
    answeredCount: number
  }
  exam: {
    slug: string
    title: string
    durationMinutes: number
    instantFeedback: boolean
    showCorrectAnswers: boolean
    leaderboardEnabled: boolean
  }
  questions: PublicQuestion[]
}

export interface PublicAnswerResult {
  answeredCount: number
  nextQuestionId?: string | null
  isLast: boolean
  isCorrect: boolean | null
  correctOptionText?: string | null
}

export interface PublicResult {
  attemptId: string
  studentName: string
  examTitle: string
  slug: string
  score: number
  totalScore: number
  percentage: number
  completionTimeSeconds: number
  ranking?: number | null
  totalRanked: number
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  status: string
  leaderboardEnabled: boolean
  leaderboard: Array<{
    rank: number
    studentName: string
    score: number
    totalScore: number
    percentage: number
    completionTimeSeconds: number
  }>
}

interface DataContextValue {
  // Admin lists
  exams: Exam[]
  questions: Question[]
  attempts: Attempt[]
  students: Student[]
  stats: DashboardStats | null
  loading: boolean
  loadAdminData: (force?: boolean) => Promise<void>

  // Exams
  createExam: (data: {
    title: string
    description: string
    durationMinutes: number
    instantFeedback: boolean
    showCorrectAnswers: boolean
    leaderboardEnabled: boolean
  }) => Promise<Exam>
  updateExam: (id: string, data: Partial<Omit<Exam, 'id' | 'slug' | 'status' | 'createdAt'>>) => Promise<void>
  deleteExam: (id: string) => Promise<void>
  publishExam: (id: string) => Promise<void>
  closeExam: (id: string) => Promise<void>
  duplicateExam: (id: string) => Promise<void>
  getExam: (id: string) => Exam | undefined

  // Questions
  loadQuestions: (examId: string) => Promise<void>
  createQuestion: (data: {
    examId: string
    text: string
    type: QuestionType
    orderIndex: number
    options: { text: string; isCorrect: boolean; orderIndex: number }[]
  }) => Promise<void>
  updateQuestion: (
    id: string,
    data: { text?: string; type?: QuestionType; options?: { text: string; isCorrect: boolean; orderIndex: number }[] }
  ) => Promise<void>
  deleteQuestion: (id: string, examId: string) => Promise<void>
  reorderQuestions: (examId: string, orderedIds: string[]) => Promise<void>
  getQuestionsForExam: (examId: string) => Question[]

  // Admin results
  fetchAttemptDetail: (attemptId: string) => Promise<AdminAttemptDetail>
  refreshAttempts: () => Promise<void>

  // Student flow (public API)
  fetchPublicExam: (slug: string) => Promise<PublicExamInfo>
  startAttempt: (slug: string, studentName: string) => Promise<{ attemptId: string }>
  autoSubmitAttempt: (attemptId: string) => Promise<void>
  sendHeartbeat: (attemptId: string) => Promise<void>
  fetchAttemptBundle: (attemptId: string) => Promise<PublicAttemptBundle>
  submitAnswer: (attemptId: string, questionId: string, optionId: string) => Promise<PublicAnswerResult>
  completeAttempt: (attemptId: string) => Promise<void>
  fetchPublicResult: (attemptId: string) => Promise<PublicResult>
  fetchPublicLeaderboard: (slug: string) => Promise<PublicResult['leaderboard']>
}

const DataContext = createContext<DataContextValue>(null as never)

/* ---------- snake_case (API) → camelCase (UI) mappers ---------- */

function mapStatus(s: string): AttemptStatus {
  const v = (s || '').toLowerCase()
  if (v === 'completed') return 'completed'
  if (v === 'expired') return 'expired'
  return 'in_progress'
}

function mapExamStatus(s: string): ExamStatus {
  const v = (s || '').toLowerCase()
  if (v === 'published') return 'published'
  if (v === 'closed') return 'closed'
  return 'draft'
}

interface ApiExam {
  id: number
  title: string
  description?: string | null
  public_slug?: string | null
  duration_minutes: number
  status: string
  instant_feedback_enabled: boolean
  show_correct_answers: boolean
  leaderboard_enabled: boolean
  created_at: string
  published_at?: string | null
  closed_at?: string | null
  total_questions_count?: number | null
  total_attempts_count?: number | null
}

function mapExam(e: ApiExam): Exam {
  return {
    id: String(e.id),
    title: e.title,
    description: e.description || '',
    slug: e.public_slug || '',
    status: mapExamStatus(e.status),
    durationMinutes: e.duration_minutes,
    instantFeedback: !!e.instant_feedback_enabled,
    showCorrectAnswers: e.show_correct_answers !== false,
    leaderboardEnabled: e.leaderboard_enabled !== false,
    createdAt: e.created_at,
    publishedAt: e.published_at || undefined,
    closedAt: e.closed_at || undefined,
    questionCount: e.total_questions_count || 0,
    attemptCount: e.total_attempts_count || 0,
  }
}

interface ApiQuestion {
  id: number
  exam_id: number
  text: string
  question_type: string
  order_index: number
  options: Array<{ id: number; question_id: number; text: string; is_correct: boolean; order_index: number }>
}

function mapQuestion(q: ApiQuestion): Question {
  return {
    id: String(q.id),
    examId: String(q.exam_id),
    text: q.text,
    type: q.question_type === 'true_false' ? 'true_false' : 'multiple_choice',
    orderIndex: q.order_index,
    options: [...(q.options || [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map(o => ({
        id: String(o.id),
        questionId: String(o.question_id),
        text: o.text,
        isCorrect: !!o.is_correct,
        orderIndex: o.order_index,
      })),
  }
}

interface ApiAttempt {
  id: number
  exam_id: number
  exam_title: string
  student_name: string
  started_at: string
  submitted_at?: string | null
  finished_at?: string | null
  status: string
  score: number
  total_questions: number
  percentage: number
  completion_time_seconds: number
}

function mapAttempt(a: ApiAttempt): Attempt {
  return {
    id: String(a.id),
    examId: String(a.exam_id),
    examTitle: a.exam_title || '',
    studentName: a.student_name || '',
    startedAt: a.started_at,
    completedAt: a.submitted_at || a.finished_at || undefined,
    score: a.score || 0,
    totalQuestions: a.total_questions || 0,
    percentage: a.percentage || 0,
    completionTimeSeconds: a.completion_time_seconds || 0,
    status: mapStatus(a.status),
  }
}

/* ---------- paginated fetch helpers ---------- */

async function fetchAllPages<T>(makeUrl: (page: number) => string, maxPages = 20, pageSize = 100): Promise<T[]> {
  const all: T[] = []
  for (let page = 1; page <= maxPages; page++) {
    const batch = await apiFetch<T[]>(makeUrl(page))
    all.push(...batch)
    if (batch.length < pageSize) break
  }
  return all
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [exams, setExams] = useState<Exam[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAttempts = useCallback(async () => {
    const list = await fetchAllPages<ApiAttempt>(p => `/results?page=${p}&page_size=100`)
    setAttempts(list.map(mapAttempt))
  }, [])

  const loadAdminData = useCallback(async (force = false) => {
    if (!force && stats) return
    setLoading(true)
    try {
      const [examList, attemptList, studentList, statsRes] = await Promise.all([
        apiFetch<ApiExam[]>('/exams'),
        fetchAllPages<ApiAttempt>(p => `/results?page=${p}&page_size=100`),
        fetchAllPages<{
          id: number
          name: string
          total_attempts: number
          average_percentage: number
          best_percentage: number
          exams_count: number
          last_attempt_at?: string | null
        }>(p => `/students?page=${p}&page_size=100`, 10),
        apiFetch<{
          total_exams: number
          published_exams: number
          total_students: number
          total_completed_attempts: number
          average_score_percentage: number
        }>('/dashboard/stats'),
      ])
      setExams(examList.map(mapExam))
      setAttempts(attemptList.map(mapAttempt))
      setStudents(
        studentList.map(s => ({
          id: String(s.id),
          name: s.name,
          totalAttempts: s.total_attempts,
          averagePercentage: s.average_percentage,
          bestPercentage: s.best_percentage,
          examsCount: s.exams_count,
          lastAttemptAt: s.last_attempt_at || undefined,
        }))
      )
      setStats({
        totalExams: statsRes.total_exams,
        publishedExams: statsRes.published_exams,
        totalStudents: statsRes.total_students,
        totalCompletedAttempts: statsRes.total_completed_attempts,
        averageScorePercentage: statsRes.average_score_percentage,
      })
    } finally {
      setLoading(false)
    }
  }, [stats])

  /* ----- Exams ----- */

  const createExam: DataContextValue['createExam'] = useCallback(async data => {
    const created = await apiFetch<ApiExam>('/exams', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        duration_minutes: data.durationMinutes,
        instant_feedback_enabled: data.instantFeedback,
        show_correct_answers: data.showCorrectAnswers,
        leaderboard_enabled: data.leaderboardEnabled,
      }),
    })
    const mapped = mapExam(created)
    setExams(prev => [mapped, ...prev.filter(e => e.id !== mapped.id)])
    return mapped
  }, [])

  const updateExam: DataContextValue['updateExam'] = useCallback(async (id, data) => {
    const payload: Record<string, unknown> = {}
    if (data.title !== undefined) payload.title = data.title
    if (data.description !== undefined) payload.description = data.description
    if (data.durationMinutes !== undefined) payload.duration_minutes = data.durationMinutes
    if (data.instantFeedback !== undefined) payload.instant_feedback_enabled = data.instantFeedback
    if (data.showCorrectAnswers !== undefined) payload.show_correct_answers = data.showCorrectAnswers
    if (data.leaderboardEnabled !== undefined) payload.leaderboard_enabled = data.leaderboardEnabled
    const updated = await apiFetch<ApiExam>(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
    const mapped = mapExam(updated)
    setExams(prev => prev.map(e => (e.id === mapped.id ? mapped : e)))
  }, [])

  const deleteExam = useCallback(async (id: string) => {
    await apiFetch(`/exams/${id}`, { method: 'DELETE' })
    setExams(prev => prev.filter(e => e.id !== id))
    setQuestions(prev => prev.filter(q => q.examId !== id))
  }, [])

  const publishExam = useCallback(async (id: string) => {
    const updated = await apiFetch<ApiExam>(`/exams/${id}/publish`, { method: 'POST' })
    const mapped = mapExam(updated)
    setExams(prev => prev.map(e => (e.id === mapped.id ? mapped : e)))
  }, [])

  const closeExam = useCallback(async (id: string) => {
    const updated = await apiFetch<ApiExam>(`/exams/${id}/close`, { method: 'POST' })
    const mapped = mapExam(updated)
    setExams(prev => prev.map(e => (e.id === mapped.id ? mapped : e)))
  }, [])

  const duplicateExam = useCallback(async (id: string) => {
    const created = await apiFetch<ApiExam>(`/exams/${id}/duplicate`, { method: 'POST' })
    const mapped = mapExam(created)
    setExams(prev => [mapped, ...prev])
  }, [])

  const getExam = useCallback((id: string) => exams.find(e => e.id === id), [exams])

  /* ----- Questions ----- */

  const loadQuestions = useCallback(async (examId: string) => {
    const list = await apiFetch<ApiQuestion[]>(`/exams/${examId}/questions`)
    const mapped = list.map(mapQuestion)
    setQuestions(prev => [...prev.filter(q => q.examId !== examId), ...mapped])
  }, [])

  const createQuestion: DataContextValue['createQuestion'] = useCallback(async data => {
    const created = await apiFetch<ApiQuestion>(`/exams/${data.examId}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        text: data.text,
        question_type: data.type,
        order_index: data.orderIndex,
        options: data.options.map(o => ({ text: o.text, is_correct: o.isCorrect, order_index: o.orderIndex })),
      }),
    })
    const mapped = mapQuestion(created)
    setQuestions(prev => [...prev.filter(q => q.id !== mapped.id), mapped])
    setExams(prev => prev.map(e => (e.id === data.examId ? { ...e, questionCount: e.questionCount + 1 } : e)))
  }, [])

  const updateQuestion: DataContextValue['updateQuestion'] = useCallback(async (id, data) => {
    const payload: Record<string, unknown> = {}
    if (data.text !== undefined) payload.text = data.text
    if (data.type !== undefined) payload.question_type = data.type
    if (data.options !== undefined) {
      payload.options = data.options.map(o => ({ text: o.text, is_correct: o.isCorrect, order_index: o.orderIndex }))
    }
    const updated = await apiFetch<ApiQuestion>(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
    const mapped = mapQuestion(updated)
    setQuestions(prev => prev.map(q => (q.id === mapped.id ? mapped : q)))
  }, [])

  const deleteQuestion = useCallback(async (id: string, examId: string) => {
    await apiFetch(`/questions/${id}`, { method: 'DELETE' })
    setQuestions(prev => prev.filter(q => q.id !== id))
    setExams(prev =>
      prev.map(e => (e.id === examId ? { ...e, questionCount: Math.max(0, e.questionCount - 1) } : e))
    )
  }, [])

  const reorderQuestions = useCallback(async (examId: string, orderedIds: string[]) => {
    const list = await apiFetch<ApiQuestion[]>(`/exams/${examId}/questions/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ordered_ids: orderedIds.map(Number) }),
    })
    const mapped = list.map(mapQuestion)
    setQuestions(prev => [...prev.filter(q => q.examId !== examId), ...mapped])
  }, [])

  const getQuestionsForExam = useCallback(
    (examId: string) =>
      questions.filter(q => q.examId === examId).sort((a, b) => a.orderIndex - b.orderIndex),
    [questions]
  )

  /* ----- Admin results ----- */

  const fetchAttemptDetail = useCallback(async (attemptId: string): Promise<AdminAttemptDetail> => {
    const d = await apiFetch<{
      id: number
      exam_id: number
      exam_title: string
      student_name: string
      status: string
      score: number
      total_questions: number
      percentage: number
      completion_time_seconds: number
      answers: Array<{
        question_text: string
        selected_option_text?: string | null
        correct_option_text?: string | null
        is_correct: boolean
      }>
    }>(`/results/${attemptId}`)
    return {
      id: String(d.id),
      examId: String(d.exam_id),
      examTitle: d.exam_title,
      studentName: d.student_name,
      status: mapStatus(d.status),
      score: d.score,
      totalQuestions: d.total_questions,
      percentage: d.percentage,
      completionTimeSeconds: d.completion_time_seconds,
      answers: (d.answers || []).map(a => ({
        questionText: a.question_text,
        selectedOptionText: a.selected_option_text || undefined,
        correctOptionText: a.correct_option_text || undefined,
        isCorrect: !!a.is_correct,
      })),
    }
  }, [])

  const refreshAttempts = useCallback(async () => {
    await loadAttempts()
  }, [loadAttempts])

  /* ----- Student flow (public API) ----- */

  const fetchPublicExam = useCallback(async (slug: string): Promise<PublicExamInfo> => {
    const e = await publicFetch<{
      public_slug: string
      title: string
      description?: string | null
      duration_minutes: number
      questions_count: number
      status: string
      instant_feedback_enabled: boolean
      show_correct_answers: boolean
      leaderboard_enabled: boolean
    }>(`/public/exams/${slug}`)
    return {
      slug: e.public_slug,
      title: e.title,
      description: e.description || '',
      status: mapExamStatus(e.status),
      durationMinutes: e.duration_minutes,
      questionsCount: e.questions_count,
      instantFeedback: !!e.instant_feedback_enabled,
      showCorrectAnswers: e.show_correct_answers !== false,
      leaderboardEnabled: e.leaderboard_enabled !== false,
    }
  }, [])

  const startAttempt = useCallback(async (slug: string, studentName: string) => {
    const a = await publicFetch<{ id: number }>(`/public/exams/${slug}/attempts`, {
      method: 'POST',
      body: JSON.stringify({ student_name: studentName }),
    })
    return { attemptId: String(a.id) }
  }, [])

  const fetchAttemptBundle = useCallback(async (attemptId: string): Promise<PublicAttemptBundle> => {
    const b = await publicFetch<{
      attempt: {
        id: number
        exam_id: number
        student_name: string
        started_at: string
        status: string
        remaining_seconds: number
        total_questions: number
        answered_count: number
      }
      exam: {
        public_slug: string
        title: string
        duration_minutes: number
        instant_feedback_enabled: boolean
        show_correct_answers: boolean
        leaderboard_enabled: boolean
      }
      questions: Array<{
        id: number
        text: string
        order_index: number
        points: number
        options: Array<{ id: number; text: string; order_index: number }>
        selected_option_id?: number | null
      }>
    }>(`/public/attempts/${attemptId}`)
    return {
      attempt: {
        id: String(b.attempt.id),
        examId: String(b.attempt.exam_id),
        studentName: b.attempt.student_name,
        startedAt: b.attempt.started_at,
        status: b.attempt.status,
        remainingSeconds: b.attempt.remaining_seconds,
        totalQuestions: b.attempt.total_questions,
        answeredCount: b.attempt.answered_count,
      },
      exam: {
        slug: b.exam.public_slug,
        title: b.exam.title,
        durationMinutes: b.exam.duration_minutes,
        instantFeedback: !!b.exam.instant_feedback_enabled,
        showCorrectAnswers: b.exam.show_correct_answers !== false,
        leaderboardEnabled: b.exam.leaderboard_enabled !== false,
      },
      questions: (b.questions || [])
        .sort((q1, q2) => q1.order_index - q2.order_index)
        .map(q => ({
          id: String(q.id),
          text: q.text,
          orderIndex: q.order_index,
          points: q.points,
          selectedOptionId: q.selected_option_id != null ? String(q.selected_option_id) : null,
          options: [...(q.options || [])]
            .sort((o1, o2) => o1.order_index - o2.order_index)
            .map(o => ({ id: String(o.id), text: o.text, orderIndex: o.order_index })),
        })),
    }
  }, [])

  const submitAnswer = useCallback(
    async (attemptId: string, questionId: string, optionId: string): Promise<PublicAnswerResult> => {
      const r = await publicFetch<{
        answered_count: number
        next_question_id: number | null
        is_last: boolean
        is_correct: boolean | null
        correct_option_text: string | null
      }>(`/public/attempts/${attemptId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ question_id: Number(questionId), option_id: Number(optionId) }),
      })
      return {
        answeredCount: r.answered_count,
        nextQuestionId: r.next_question_id != null ? String(r.next_question_id) : null,
        isLast: r.is_last,
        // Correctness is only ever revealed by the server when instant
        // feedback is enabled — the client never sees correct answers otherwise.
        isCorrect: r.is_correct,
        correctOptionText: r.correct_option_text,
      }
    },
    []
  )

  const completeAttempt = useCallback(async (attemptId: string) => {
    // Server ends the attempt, expires it if the time is up, and scores it.
    await publicFetch(`/public/attempts/${attemptId}/complete`, { method: 'POST' })
  }, [])

  // Auto submit when the student leaves the exam page before pressing Submit.
  // `keepalive` lets the request outlive the page during an unload; sendBeacon
  // is the fallback for browsers that drop keepalive fetches on tab close.
  // The backend is idempotent, so a duplicated delivery is harmless.
  const autoSubmitAttempt = useCallback((attemptId: string) => {
    const url = `/api/public/attempts/${attemptId}/auto-submit`
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob(['{}'], { type: 'application/json' })
        if (navigator.sendBeacon(url, blob)) return Promise.resolve()
      }
    } catch {
      // fall through to fetch
    }
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      keepalive: true,
    }).then(() => undefined).catch(() => undefined)
  }, [])

  // Tells the server the exam page is still open. When these stop arriving the
  // server auto-submits the attempt (closed tab / dead browser backstop).
  const sendHeartbeat = useCallback(async (attemptId: string) => {
    try {
      await publicFetch<{ status: string }>(`/public/attempts/${attemptId}/heartbeat`, {
        method: 'POST',
      })
    } catch {
      // A failed heartbeat must never interrupt the exam.
    }
  }, [])

  const fetchPublicResult = useCallback(async (attemptId: string): Promise<PublicResult> => {
    const r = await publicFetch<{
      attempt_id: number
      student_name: string
      exam_title: string
      public_slug: string
      score: number
      total_score: number
      percentage: number
      completion_time_seconds: number
      ranking: number | null
      total_ranked: number
      correct_answers: number
      wrong_answers: number
      unanswered: number
      status: string
      leaderboard_enabled: boolean
      leaderboard: Array<{
        rank: number
        student_name: string
        score: number
        total_score: number
        percentage: number
        completion_time_seconds: number
      }>
    }>(`/public/attempts/${attemptId}/result`)
    return {
      attemptId: String(r.attempt_id),
      studentName: r.student_name,
      examTitle: r.exam_title,
      slug: r.public_slug,
      score: r.score,
      totalScore: r.total_score,
      percentage: r.percentage,
      completionTimeSeconds: r.completion_time_seconds,
      ranking: r.ranking,
      totalRanked: r.total_ranked,
      correctAnswers: r.correct_answers,
      wrongAnswers: r.wrong_answers,
      unanswered: r.unanswered,
      status: r.status,
      leaderboardEnabled: !!r.leaderboard_enabled,
      leaderboard: (r.leaderboard || []).map(e => ({
        rank: e.rank,
        studentName: e.student_name,
        score: e.score,
        totalScore: e.total_score,
        percentage: e.percentage,
        completionTimeSeconds: e.completion_time_seconds,
      })),
    }
  }, [])

  const fetchPublicLeaderboard = useCallback(async (slug: string): Promise<PublicResult['leaderboard']> => {
    const list = await publicFetch<
      Array<{
        rank: number
        student_name: string
        score: number
        total_score: number
        percentage: number
        completion_time_seconds: number
      }>
    >(`/public/exams/${slug}/leaderboard`)
    return list.map(e => ({
      rank: e.rank,
      studentName: e.student_name,
      score: e.score,
      totalScore: e.total_score,
      percentage: e.percentage,
      completionTimeSeconds: e.completion_time_seconds,
    }))
  }, [])

  return (
    <DataContext.Provider
      value={{
        exams,
        questions,
        attempts,
        students,
        stats,
        loading,
        loadAdminData,
        createExam,
        updateExam,
        deleteExam,
        publishExam,
        closeExam,
        duplicateExam,
        getExam,
        loadQuestions,
        createQuestion,
        updateQuestion,
        deleteQuestion,
        reorderQuestions,
        getQuestionsForExam,
        fetchAttemptDetail,
        refreshAttempts,
        fetchPublicExam,
        startAttempt,
        autoSubmitAttempt,
        sendHeartbeat,
        fetchAttemptBundle,
        submitAnswer,
        completeAttempt,
        fetchPublicResult,
        fetchPublicLeaderboard,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
