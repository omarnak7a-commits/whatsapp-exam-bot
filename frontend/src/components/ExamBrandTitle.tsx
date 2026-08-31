/**
 * ExamBrandTitle
 *
 * Large, centered "مس ايه فايز" branding for the student exam page.
 *
 * This is NOT a faint watermark: it is a bold, clearly visible brand mark
 * rendered in the centre of the viewport, in the platform's indigo/teal
 * gradient so it stands out against the light page background.
 *
 * It sits behind the exam interface (z-0) and never captures pointer or touch
 * events (`pointer-events-none`), so questions, answer options, the timer and
 * every button stay fully interactive. Hidden from assistive technology since
 * it is decorative branding, and not selectable so it cannot be dragged.
 *
 * Sizing uses clamp() against the viewport width, so it scales smoothly from
 * mobile to desktop and never overflows.
 *
 * Vertical placement is responsive: centered on tablet/desktop, where the
 * question card (max-w-xl) leaves plenty of room on both sides, and moved to
 * the lower free area on phones, where an opaque full-width card would
 * otherwise hide it completely.
 */
interface ExamBrandTitleProps {
  /** Brand text. */
  text?: string
  /** Extra classes for the fixed positioning wrapper. */
  className?: string
}

export default function ExamBrandTitle({
  text = 'مس ايه فايز',
  className = '',
}: ExamBrandTitleProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 flex select-none items-end justify-center overflow-hidden pb-20 sm:items-center sm:pb-0 ${className}`}
    >
      <span
        dir="rtl"
        className="whitespace-nowrap bg-gradient-to-l from-indigo-600 to-teal-500 bg-clip-text font-black leading-none text-transparent"
        style={{
          // Scales with the viewport: comfortable on phones, big on desktop.
          fontSize: 'clamp(2.75rem, 13vw, 9rem)',
          letterSpacing: '0.02em',
          // Clearly visible branding, not a faint watermark, while still
          // letting the exam content remain the focus.
          opacity: 0.35,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {text}
      </span>
    </div>
  )
}
