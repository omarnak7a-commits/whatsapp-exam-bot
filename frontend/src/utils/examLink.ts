/**
 * Utilities for building and sharing the real public exam link.
 *
 * The "real link" is the full absolute URL of the exam's public page,
 * e.g. https://your-domain.com/exam/math-final-2026-x1y2 — ready to be
 * shared on WhatsApp or Telegram.
 */

/** Build the real absolute URL for an exam's public page. */
export function examLink(slug?: string | null): string | null {
  if (!slug) return null;
  const base =
    typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : '';
  return `${base}/exam/${slug}`;
}

/**
 * Copy text to the clipboard with fallbacks.
 * Works in secure (https) contexts via the modern API, and in
 * non-secure (http) contexts via the legacy execCommand path.
 * Resolves `true` only when the text was actually copied.
 */
export async function copyText(text: string): Promise<boolean> {
  // 1) Modern async Clipboard API (requires a secure context + user gesture)
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied / aborted — fall through to the legacy path.
  }

  // 2) Legacy fallback: hidden textarea + execCommand('copy')
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Avoid mobile keyboard popup + preserve scroll position
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);

    const previousActive = document.activeElement as HTMLElement | null;
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (previousActive && previousActive.focus) {
      previousActive.focus();
    }
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copy the real exam link. Always gives visible feedback:
 * - on success: alert confirms and shows the copied URL,
 * - on failure: alert shows the URL so it can be copied manually.
 */
export function copyExamLink(slug?: string | null): void {
  const url = examLink(slug);
  if (!url) {
    alert('مفيش رابط متاح للامتحان ده');
    return;
  }
  copyText(url)
    .then((ok) => {
      alert(
        ok
          ? `تم نسخ الرابط! 📋\n\n${url}`
          : `لم يتم نسخ الرابط تلقائياً — انسخه من هنا:\n\n${url}`
      );
    })
    .catch(() => {
      alert(`لم يتم نسخ الرابط تلقائياً — انسخه من هنا:\n\n${url}`);
    });
}
