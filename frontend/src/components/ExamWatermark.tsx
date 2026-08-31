/**
 * ExamWatermark
 *
 * Decorative background watermark for the student exam question area.
 *
 * - Sits behind the question content (z-0) and is clipped by the question card.
 * - Never captures pointer/touch events (`pointer-events-none`) so answer
 *   options, navigation, feedback and the timer stay fully interactive.
 * - Not selectable and hidden from assistive technology (`aria-hidden`).
 * - Size is responsive and container based (cqw) with a viewport based
 *   fallback (vw) for older browsers, so it scales down on tablet/mobile
 *   and never widens or overflows the question card.
 * - Shows the teacher name above the platform name; both lines are rotated
 *   together as a single block so the diagonal stays consistent.
 */
interface ExamWatermarkProps {
  /** Watermark text (teacher name). */
  text?: string
  /** Platform / website name shown under the main watermark text. */
  siteName?: string
  /** Extra classes for the absolutely positioned wrapper. */
  className?: string
}

export default function ExamWatermark({
  text = 'مس ايه فايز',
  siteName = 'جبت كام؟',
  className = '',
}: ExamWatermarkProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 flex select-none items-center justify-center overflow-hidden ${className}`}
    >
      {/* Both lines rotate as one block, keeping the original diagonal. */}
      <div
        dir="rtl"
        className="flex flex-col items-center justify-center"
        style={{
          // Subtle (~6%) and slightly diagonal - unchanged from the original.
          opacity: 0.06,
          transform: 'rotate(-15deg)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <span
          // Fallback for browsers without container query units.
          className="whitespace-nowrap font-black leading-none text-indigo-700 text-[length:min(5.25rem,13.5vw)]"
          style={{
            // Scales with the question card; ignored (falls back to the vw
            // value above) by browsers that do not support cqw. Sized so the
            // rotated text spans ~87% of the card and never overflows it.
            fontSize: 'min(5.25rem, 14.5cqw)',
            letterSpacing: '0.02em',
          }}
        >
          {text}
        </span>
        <span
          // Roughly half the main line, so the platform name reads as a
          // secondary part of the same watermark.
          className="whitespace-nowrap font-black leading-none text-indigo-700 text-[length:min(2.5rem,6.5vw)]"
          style={{
            fontSize: 'min(2.5rem, 7cqw)',
            letterSpacing: '0.06em',
            marginTop: '0.15em',
          }}
        >
          {siteName}
        </span>
      </div>
    </div>
  )
}
