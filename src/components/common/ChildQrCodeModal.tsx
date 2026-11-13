import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Share2, 
  Download, 
  ShieldCheck, 
  Sparkles,
  Smartphone
} from 'lucide-react';
import QRCode from 'qrcode';
import { getShareableChildLink, getWhatsAppShareUrl } from '../../lib/parentChildService';
import { Language } from '../../types';

interface ChildQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  childName: string;
  linkCode: string;
  lang: Language;
}

export function ChildQrCodeModal({
  isOpen,
  onClose,
  childName,
  linkCode,
  lang
}: ChildQrCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = getShareableChildLink(linkCode);
  const isCop = lang === 'cop' || lang === 'copt';

  useEffect(() => {
    if (!isOpen || !linkCode) return;

    // Generate high-resolution QR code
    QRCode.toDataURL(shareUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#002B49', // Church Blue
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => {
        setQrDataUrl(url);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
        setError(isCop ? 'Ⲙⲡⲓϣϫⲉⲙϫⲟⲙ ⲉ̀ⲑⲁⲙⲓⲟ ⲙ̀ⲡⲓ-QR' : lang === 'ar' ? 'مش قادرين نعمل كود QR.' : 'Failed to generate QR Code');
      });
  }, [isOpen, linkCode, shareUrl, lang, isCop]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(linkCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {}
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {}
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Child_QR_${linkCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareWhatsApp = () => {
    const url = getWhatsAppShareUrl(linkCode, childName, lang);
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-[var(--color-church-cream-dark)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--color-church-blue)] to-[var(--color-church-burgundy)] text-white p-5 relative text-center">
            <button
              onClick={onClose}
              className={`absolute top-4 ${lang === 'ar' ? 'left-4' : 'right-4'} p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer`}
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-2 text-amber-300">
              <QrCode size={24} />
            </div>

            <h3 className="text-lg font-extrabold text-white">
              {isCop ? 'Ⲡⲓⲕⲱⲇⲓⲝ QR ⲙ̀ⲙⲩⲥⲧⲏⲣⲓⲟⲛ ⲛ̀ⲧⲉ ⲡⲓⲁⲗⲟⲩ' : lang === 'ar' ? 'كود QR السري بتاعك' : 'Student Secret QR Code'}
            </h3>
            <p className="text-xs text-amber-100/90 font-medium mt-0.5">
              {childName}
            </p>
          </div>

          {/* QR Code Canvas Body */}
          <div className="p-6 flex flex-col items-center space-y-4">
            <div className="relative p-4 bg-white rounded-2xl border-2 border-[var(--color-church-cream-dark)] shadow-md flex items-center justify-center">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Child Link QR Code" 
                  className="w-56 h-56 sm:w-60 sm:h-60 rounded-xl"
                />
              ) : (
                <div className="w-56 h-56 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <div className="w-8 h-8 border-3 border-[var(--color-church-blue)] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">{isCop ? 'ⲥⲉⲥⲟⲃϯ ⲙ̀ⲡⲓ-QR...' : lang === 'ar' ? 'بنجهّز الكود...' : 'Generating QR...'}</span>
                </div>
              )}
            </div>

            {/* Secret Code Pill */}
            <div className="w-full bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">
                  {isCop ? 'Ⲡⲓⲕⲱⲇⲓⲝ ⲉⲧⲥϧⲏⲟⲩⲧ' : lang === 'ar' ? 'الكود السري المكتوب' : 'Secret Text Code'}
                </span>
                <span className="font-mono font-black text-lg text-[var(--color-church-blue)] tracking-wider">
                  {linkCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedCode ? (isCop ? 'Ⲁⲩⲟⲗϥ!' : lang === 'ar' ? 'اتنسخ!' : 'Copied!') : (isCop ? 'Ⲱⲗⲓ' : lang === 'ar' ? 'نسخ' : 'Copy')}</span>
              </button>
            </div>

            {/* Explainer for the Child */}
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2 text-start">
              <Smartphone size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                {isCop
                  ? 'Ⲙⲁⲧⲁⲙⲟ ⲡⲁⲓ-QR ⲉ̀ϯⲕⲁⲙⲉⲣⲁ ⲛ̀ⲧⲉ ⲛⲉⲕⲓⲟϯ ϧⲉⲛ «Ⲡⲓⲡⲩⲗⲏ ⲛ̀ⲧⲉ ⲛⲓⲓⲟϯ» ⲉ̀ⲑⲱⲧ ⲛ̀ⲛⲓⲕⲗⲟⲙ ⲥⲟⲡ ⲭⲱⲗⲉⲙ!'
                  : lang === 'ar'
                  ? 'خلّي ولي أمرك يوجّه كاميرا موبايله للكود ده من شاشة "بوابة الأسرة" عشان تربطوا الحسابين بسرعة!'
                  : "Show this QR code to Mom or Dad's phone camera in the Parent Dashboard to link instantly!"}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 w-full pt-1">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Share2 size={14} />
                <span>{isCop ? 'Ⲟⲩⲁⲧⲥⲁⲡ' : lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>{isCop ? 'Ⲁⲣⲉϩ ⲉ̀ⲡⲓϩⲓⲕⲱⲛ' : lang === 'ar' ? 'احفظ الصورة' : 'Save Image'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-100 text-center text-[11px] text-gray-500 font-medium">
            🔒 {isCop ? 'Ⲡⲓⲕⲱⲇⲓⲝ ⲉⲧϩⲏⲡ ⲛ̀ⲧⲉ ⲧⲉⲕⲡⲁⲧⲣⲓⲁ ⲙ̀ⲙⲁⲩⲁⲧⲥ' : lang === 'ar' ? 'كود مشفّر ومخصص لعيلتك بس' : 'Encrypted code exclusively for your family'}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
