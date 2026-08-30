import React from 'react';

/**
 * Subtle, non-interactive branding watermark shown inside every question card.
 * The watermark text is the teacher brand "مس ايه فايز" — the platform name
 * "جبت كام؟" is never used as a watermark.
 */
export const Watermark: React.FC = () => (
  <span className="watermark" aria-hidden="true">
    <span>مس ايه فايز</span>
  </span>
);

export default Watermark;
