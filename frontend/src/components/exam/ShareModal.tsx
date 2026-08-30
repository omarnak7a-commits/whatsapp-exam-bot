import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode, Link2, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { examLink, copyExamLink } from '../../utils/examLink';

interface ShareModalProps {
  slug?: string;
  title: string;
  onClose: () => void;
}

/** Share dialog: public exam link + copy button + QR code for easy sharing. */
export const ShareModal: React.FC<ShareModalProps> = ({ slug, title, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const url = examLink(slug);

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 180,
      margin: 1,
      color: { dark: '#0A1931', light: '#FFFFFF' },
    }).catch(() => undefined);
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCopy = async () => {
    await copyExamLink(slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`مشاركة ${title}`}>
      <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand-600" />
            مشاركة الامتحان
          </h3>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
          شارك الرابط أو الـ QR مع طلابك — أي حد عنده الرابط يقدر يدخل الامتحان مباشرة بدون تسجيل.
        </p>

        {slug ? (
          <>
            <div className="flex flex-col items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <canvas ref={canvasRef} className="rounded-xl bg-white border border-slate-200" aria-label="QR code لرابط الامتحان" />
              <p dir="ltr" className="font-mono text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 w-full text-center truncate select-all">
                {url}
              </p>
            </div>

            <div className="flex gap-3 mt-5">
              <Button fullWidth onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 ml-2" /> : <Copy className="w-4 h-4 ml-2" />}
                {copied ? 'تم النسخ ✅' : 'نسخ الرابط'}
              </Button>
              <a href={`/exam/${slug}`} target="_blank" rel="noreferrer" className="flex-1">
                <Button variant="secondary" fullWidth>
                  <ExternalLink className="w-4 h-4 ml-2" />
                  فتح
                </Button>
              </a>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/60 rounded-2xl p-4">
            <Link2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-800 leading-relaxed">
              الامتحان لسه مسودة — انشره الأول عشان يتولد الرابط العام والـ QR.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
