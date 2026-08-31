/**
 * ExamBrandName
 *
 * Website/brand name shown in the header of the question-solving interface:
 * "جبت كام؟ (مس ايه فايز)".
 *
 * This is the page-level top-bar element, distinct from the large branding
 * inside the exam card header (ExamCardHeader). It is a compact RTL pill in
 * the existing header row without covering the timer, the question counter or
 * any control. On small screens the teacher-name part is allowed to shrink and
 * truncate rather than overflow the header.
 */
interface ExamBrandNameProps {
  /** Platform name. */
  siteName?: string
  /** Teacher name shown in brackets next to the platform name. */
  teacherName?: string
  className?: string
}

export default function ExamBrandName({
  siteName = 'جبت كام؟',
  teacherName = 'مس ايه فايز',
  className = '',
}: ExamBrandNameProps) {
  return (
    <div
      dir="rtl"
      className={`inline-flex min-w-0 max-w-full items-baseline gap-1 rounded-xl bg-indigo-50/70 px-2.5 py-1 ${className}`}
    >
      <span className="whitespace-nowrap bg-gradient-to-l from-indigo-600 to-teal-500 bg-clip-text text-sm font-black text-transparent">
        {siteName}
      </span>
      <span className="min-w-0 truncate text-xs font-bold text-indigo-500">
        ({teacherName})
      </span>
    </div>
  )
}
