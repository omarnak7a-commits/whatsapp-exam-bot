/**
 * ExamWatermark — student exam branding strip.
 *
 * Renders the exam branding "✦ مس ايه فايز ✦" as a prominent, centered,
 * readable line of text inside the question card. It is rendered twice by
 * the student exam page: once ABOVE the question and once BELOW the answers
 * (no diagonal/background watermark — this is ordinary in-flow text).
 *
 * - Uses the site typography (inherited Cairo) and brand colors
 *   (indigo question accents + teal sparkles) at a readable ~70-80% alpha.
 * - Large, official-exam-branding size: ~24px mobile / ~30px tablet / 36px
 *   desktop — prominent yet secondary to the question and answers.
 * - Normal document flow: never overlaps the question, answers, feedback,
 *   timer or navigation, and never widens/overflows the card.
 * - Non-interactive, not selectable, hidden from assistive technology.
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
      className={`select-none text-center text-[24px] sm:text-[30px] md:text-[36px] font-bold leading-snug text-indigo-600/70 ${className}`}
    >
      <span className="text-[0.62em] text-teal-500/80">✦</span> <span className="mx-2 sm:mx-3">{text}</span> <span className="text-[0.62em] text-teal-500/80">✦</span>
    </p>
  )
}
