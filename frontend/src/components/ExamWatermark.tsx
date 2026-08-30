/**
 * ExamWatermark — student exam branding strip.
 *
 * Renders the exam branding "✦ مس ايه فايز ✦" as an ordinary, centered,
 * readable line of text inside the question card. It is rendered twice by
 * the student exam page: once ABOVE the question and once BELOW the answers
 * (the previous large diagonal low-opacity background watermark was removed).
 *
 * - Uses the site typography (inherited Cairo) and brand colors
 *   (indigo question accents + teal sparkles) at a readable ~70-80% alpha.
 * - Normal document flow: never overlaps the question, answers, feedback,
 *   timer or navigation, and never widens/overflows the card.
 * - Non-interactive, not selectable, hidden from assistive technology.
 * - Compact size that scales slightly down on small screens.
 */
interface ExamWatermarkProps {
  /** Branding text. */
  text?: string
  /** Extra classes for spacing/placement (e.g. margins). */
  className?: string
}

export default function ExamWatermark({
  text = 'مس ايه فايز',
  className = '',
}: ExamWatermarkProps) {
  return (
    <p
      aria-hidden="true"
      dir="rtl"
      className={`select-none text-center text-sm sm:text-base font-medium leading-normal text-indigo-600/70 ${className}`}
    >
      <span className="text-teal-500/80">✦</span> <span className="mx-2">{text}</span> <span className="text-teal-500/80">✦</span>
    </p>
  )
}
