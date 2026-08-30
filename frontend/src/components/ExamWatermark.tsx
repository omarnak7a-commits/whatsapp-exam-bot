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
 */
interface ExamWatermarkProps {
  /** Watermark text. */
  text?: string
  /** Extra classes for the absolutely positioned wrapper. */
  className?: string
}

export default function ExamWatermark({
  text = 'مس ايه فايز',
  className = '',
}: ExamWatermarkProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 flex select-none items-center justify-center overflow-hidden ${className}`}
    >
      <span
        dir="rtl"
        // Fallback for browsers without container query units.
        className="whitespace-nowrap font-black leading-none text-indigo-700 text-[length:min(5.25rem,13.5vw)]"
        style={{
          // Scales with the question card; ignored (falls back to the vw
          // value above) by browsers that do not support cqw. Sized so the
          // rotated text spans ~87% of the card and never overflows it.
          fontSize: 'min(5.25rem, 14.5cqw)',
          // Subtle (~6%) and slightly diagonal.
          opacity: 0.06,
          transform: 'rotate(-15deg)',
          letterSpacing: '0.02em',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {text}
      </span>
    </div>
  )
}
