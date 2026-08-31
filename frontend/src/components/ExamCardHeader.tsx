/**
 * ExamCardHeader
 *
 * Branding header rendered INSIDE the exam question card, above the question
 * content. It is a real, in-flow foreground element - not a watermark, not a
 * background layer and not a floating overlay.
 *
 * Hierarchy inside the card:
 *   1. "مس ايه فايز"  - large branding (this component)
 *   2. exam title      - existing information, kept below the branding
 *   3. question content / answers (rendered by the page, after this header)
 *
 * The header uses the platform's existing indigo/teal gradient on a soft tinted
 * band so it reads as an intentional, premium part of the card rather than an
 * add-on, and it is separated from the question body by the card's own border
 * colour.
 */
interface ExamCardHeaderProps {
  /** Large branding text at the top of the card. */
  brandText?: string
  /** Existing exam title, shown under the branding. */
  examTitle?: string
  className?: string
}

export default function ExamCardHeader({
  brandText = 'مس ايه فايز',
  examTitle,
  className = '',
}: ExamCardHeaderProps) {
  return (
    <div
      dir="rtl"
      className={`border-b border-indigo-100 bg-gradient-to-b from-indigo-50/80 to-white px-6 py-6 text-center sm:py-7 ${className}`}
    >
      <h1
        className="bg-gradient-to-l from-indigo-600 to-teal-500 bg-clip-text font-black leading-tight text-transparent"
        style={{
          // Large and responsive: comfortable on phones, prominent on desktop.
          fontSize: 'clamp(1.75rem, 7vw, 2.75rem)',
          letterSpacing: '0.01em',
        }}
      >
        {brandText}
      </h1>

      {examTitle && (
        <>
          {/* Small divider keeps the branding visually dominant over the title. */}
          <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-gradient-to-l from-indigo-500 to-teal-400 opacity-70" />
          <p className="mt-3 text-sm font-bold text-gray-600">{examTitle}</p>
        </>
      )}
    </div>
  )
}
