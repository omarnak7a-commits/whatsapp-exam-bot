import { useState, useEffect, useRef } from 'react'
import { useData, PublicAttemptBundle } from '@/contexts/DataContext'
import { useNavigate, useParams } from '@/router'
import Logo from '@/components/Logo'
import ExamBrandTitle from '@/components/ExamBrandTitle'
import ExamBrandName from '@/components/ExamBrandName'

interface LocalAnswer {
  questionId: string
  optionId: string
}

export default function ExamTake() {
  const { fetchAttemptBundle, submitAnswer, completeAttempt, autoSubmitAttempt, sendHeartbeat } = useData()
  const navigate = useNavigate()
  const params = useParams()
  const attemptId = params.attemptId || ''
  const slug = params.slug || ''

  const [bundle, setBundle] = useState<PublicAttemptBundle | null>(null)
  const [answers, setAnswers] = useState<LocalAnswer[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctText: string; selectedText: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)
  // Tracks the in-flight "save answer" request so an exit never scores the
  // attempt before the answer the student just picked has reached the server.
  const pendingAnswerRef = useRef<Promise<unknown> | null>(null)
  // Guards against sending the auto-submit more than once per page.
  const autoSubmittedRef = useRef(false)
  // The attempt id is read inside unload handlers, where React state may be
  // stale; a ref always holds the current value.
  const attemptIdRef = useRef<string>('')

  // Load the attempt + exam + questions from the server (no correct answers exposed).
  useEffect(() => {
    if (!attemptId) return
    fetchAttemptBundle(attemptId)
      .then(b => {
        setBundle(b)
        setTimeLeft(Math.max(0, b.attempt.remainingSeconds))
        setAnswers(
          b.questions
            .filter(q => q.selectedOptionId)
            .map(q => ({ questionId: q.id, optionId: q.selectedOptionId as string }))
        )
        attemptIdRef.current = String(b.attempt.id)
        if (b.attempt.status !== 'IN_PROGRESS') {
          // The server already finalized this attempt (auto-submitted on a
          // previous exit, refresh, or timed out): show the result, never the
          // exam. completedRef stops any exit handler from firing afterwards.
          completedRef.current = true
          autoSubmittedRef.current = true
          navigate(`/exam/${b.exam.slug}/result/${b.attempt.id}`, true)
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل المحاولة'))
  }, [attemptId, fetchAttemptBundle, navigate])

  // Server-side timer countdown: the server is the authority — when time runs
  // out we ask it to end/score the attempt (it marks it expired if needed).
  useEffect(() => {
    if (!bundle || bundle.attempt.status !== 'IN_PROGRESS') return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          if (!completedRef.current) {
            completedRef.current = true
            autoSubmittedRef.current = true
            completeAttempt(bundle.attempt.id)
              .catch(() => {})
              .finally(() => navigate(`/exam/${bundle.exam.slug}/result/${bundle.attempt.id}`))
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle])

  // ---------------------------------------------------------------------
  // Auto submit when the student leaves the exam page before submitting.
  //
  // Covers: Back button, in-app navigation, URL change, refresh, tab close,
  // browser close and switching away for good. Browsers do not fire the same
  // event in every one of those cases, so several are used together and the
  // send itself is guarded to run only once.
  //
  // The frontend is only a fast path: the backend auto-submits on the next
  // page load and sweeps attempts whose heartbeat went stale, so the rule
  // still holds when no event fires at all (crash, forced kill, offline).
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!bundle || bundle.attempt.status !== 'IN_PROGRESS') return

    const fireAutoSubmit = () => {
      if (completedRef.current || autoSubmittedRef.current) return
      autoSubmittedRef.current = true
      const id = attemptIdRef.current
      if (!id) return
      // Wait for a save that is still in flight so the student's last answer
      // is counted, but never block the unload if it has already finished.
      const pending = pendingAnswerRef.current
      if (pending) {
        pending.then(() => autoSubmitAttempt(id)).catch(() => autoSubmitAttempt(id))
      } else {
        autoSubmitAttempt(id)
      }
    }

    const onPageHide = () => fireAutoSubmit()
    const onBeforeUnload = () => { fireAutoSubmit() }
    const onVisibilityChange = () => {
      // 'hidden' is the only reliable signal on mobile Safari/Chrome, where a
      // tab close or app switch may never fire pagehide/beforeunload.
      if (document.visibilityState === 'hidden') fireAutoSubmit()
    }
    // Browser Back: submit before the route actually changes.
    const onPopState = () => fireAutoSubmit()

    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('popstate', onPopState)
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Heartbeat: while the page is open the server knows the student is there.
    // Well below the server's grace window so a live page is never swept.
    const heartbeat = setInterval(() => {
      if (completedRef.current || autoSubmittedRef.current) return
      if (attemptIdRef.current) sendHeartbeat(attemptIdRef.current)
    }, 15000)

    return () => {
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(heartbeat)
      // Unmounting while the attempt is still running means the student
      // navigated away inside the SPA (Back, a link, a URL change).
      fireAutoSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  const { exam, questions } = bundle
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">لا توجد أسئلة في هذا الامتحان</p>
      </div>
    )
  }

  const question = questions[currentIdx]
  // The public payload intentionally omits question metadata; a true/false
  // question on this platform always carries exactly the options صح / غلط.
  const isTrueFalse = !!question && question.options.length === 2 &&
    ['صح', 'غلط'].every(t => question.options.some(o => o.text === t))
  const answeredIds = new Set(answers.map(a => a.questionId))
  const alreadyAnswered = answeredIds.has(question?.id || '')
  const answeredCount = answeredIds.size

  const mm = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const ss = (timeLeft % 60).toString().padStart(2, '0')
  const timerUrgent = timeLeft < 60

  async function finishExam() {
    if (completedRef.current) return
    completedRef.current = true
    // This is a real submit, not an exit: stop the auto-submit handlers.
    autoSubmittedRef.current = true
    clearInterval(timerRef.current!)
    try {
      // Never score before an in-flight answer save has landed.
      if (pendingAnswerRef.current) {
        try { await pendingAnswerRef.current } catch { /* saved or failed, either way proceed */ }
      }
      await completeAttempt(bundle!.attempt.id)
    } catch {
      // Even if the call fails, the server expires/scores on time; show result.
    }
    navigate(`/exam/${bundle!.exam.slug}/result/${bundle!.attempt.id}`)
  }

  async function handleAnswer(optionId: string) {
    if (submitting || alreadyAnswered || !question) return
    setSubmitting(true)
    setError('')
    // Track the save so an exit happening right now waits for it: the last
    // answer the student picked must be persisted before the score is taken.
    const savePromise = submitAnswer(bundle!.attempt.id, question.id, optionId)
    pendingAnswerRef.current = savePromise
    try {
      const result = await savePromise
      setAnswers(prev => [...prev, { questionId: question.id, optionId }])

      // Correctness is only revealed by the server when instant feedback is on.
      if (result.isCorrect !== null) {
        const selectedOpt = question.options.find(o => o.id === optionId)
        setFeedback({
          isCorrect: result.isCorrect,
          correctText: result.correctOptionText || '',
          selectedText: selectedOpt?.text || '',
        })
      } else {
        await advance()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الإجابة، حاول مرة أخرى')
    } finally {
      if (pendingAnswerRef.current === savePromise) pendingAnswerRef.current = null
      setSubmitting(false)
    }
  }

  async function advance() {
    setFeedback(null)
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1)
    } else {
      finishExam()
    }
  }

  const progressPct = Math.round((answeredCount / questions.length) * 100)

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col">
      {/* Large centered brand mark, behind the exam interface and never
          interactive, so it cannot block questions or answer buttons. */}
      <ExamBrandTitle />

      {/* Header */}
      <div className="relative z-10 bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Logo size="sm" />
          {/* Website name for the question-solving interface. Hidden on very
              small screens where the header row has no room; it also appears
              under the progress bar on mobile (see below). */}
          <ExamBrandName className="hidden sm:inline-flex" />
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500">{exam.title}</p>
          <p className="text-sm font-bold text-gray-700">السؤال {currentIdx + 1} من {questions.length}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-black text-sm ${timerUrgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-50 text-indigo-600'}`} dir="ltr">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {mm}:{ss}
        </div>
      </div>

      {/* Progress */}
      <div className="relative z-10 bg-white px-4 pb-3">
        {/* Mobile placement of the website name: the header row is too narrow
            on phones, so it sits here instead and never overflows. */}
        <div className="flex justify-center pb-2 sm:hidden">
          <ExamBrandName />
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-indigo-600 to-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{answeredCount} تمت الإجابة</span>
          <span>{questions.length - answeredCount} متبقية</span>
        </div>
      </div>

      {error && (
        <div className="relative z-10 px-4 pt-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 text-center">{error}</div>
        </div>
      )}

      {/* Question */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-xl">
          {question && (
            <div className="bg-white rounded-2xl shadow-md shadow-indigo-50 border border-indigo-50 overflow-hidden relative [container-type:inline-size]">
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isTrueFalse ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {isTrueFalse ? 'صح أو غلط' : 'اختيار من متعدد'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-800 mb-6 leading-relaxed">{question.text}</h2>

                {!feedback ? (
                  <div className={`grid gap-3 ${isTrueFalse ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {question.options.map(opt => {
                      const selected = answers.find(a => a.questionId === question.id && a.optionId === opt.id)
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleAnswer(opt.id)}
                          disabled={submitting || alreadyAnswered}
                          className={`w-full text-right px-5 py-4 rounded-2xl border-2 font-semibold text-sm transition-all duration-150
                            ${alreadyAnswered && selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' :
                              alreadyAnswered ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-default' :
                              'border-gray-200 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer'}
                            ${isTrueFalse ? 'text-center text-lg py-6' : ''}`}
                        >
                          {isTrueFalse && (
                            <span className="block text-2xl mb-1">{opt.text === 'صح' ? '✅' : '❌'}</span>
                          )}
                          {opt.text}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className={`rounded-2xl p-5 text-center ${feedback.isCorrect ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                    <p className="text-3xl mb-2">{feedback.isCorrect ? '✅' : '❌'}</p>
                    <p className={`text-lg font-black mb-2 ${feedback.isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                      {feedback.isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة'}
                    </p>
                    {!feedback.isCorrect && (
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <p>إجابتك: <span className="font-semibold text-red-500">{feedback.selectedText}</span></p>
                        {feedback.correctText && (
                          <p>الإجابة الصحيحة: <span className="font-semibold text-green-600">{feedback.correctText}</span></p>
                        )}
                      </div>
                    )}
                    <button
                      onClick={advance}
                      className={`mt-4 px-6 py-2.5 rounded-xl font-bold text-sm text-white ${feedback.isCorrect ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                      {currentIdx < questions.length - 1 ? 'السؤال التالي ←' : 'إنهاء الامتحان'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question dots nav */}
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {questions.map((q, i) => {
              const answered = answeredIds.has(q.id)
              const isCurrent = i === currentIdx
              return (
                <button
                  key={q.id}
                  onClick={() => { if (!feedback) setCurrentIdx(i) }}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all
                    ${isCurrent ? 'bg-indigo-600 text-white scale-110' :
                      answered ? 'bg-green-500 text-white' :
                      'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          {/* Finish early button (if all answered) */}
          {answeredCount === questions.length && !feedback && (
            <button
              onClick={finishExam}
              className="w-full mt-4 py-3 bg-gradient-to-l from-indigo-600 to-teal-500 text-white font-black rounded-2xl text-base shadow-lg shadow-indigo-200"
            >
              إنهاء الامتحان ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
