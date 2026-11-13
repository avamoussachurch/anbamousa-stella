import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  CameraOff, 
  RefreshCw, 
  Upload, 
  Flashlight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  KeyRound, 
  X,
  ScanLine,
  Image as ImageIcon
} from 'lucide-react';
import jsQR from 'jsqr';
import { extractSecretCodeFromInput } from '../../lib/parentChildService';

interface QrCodeScannerProps {
  onCodeDetected: (secretCode: string) => void;
  onSwitchToManual?: () => void;
  lang: 'en' | 'ar';
}

export function QrCodeScanner({
  onCodeDetected,
  onSwitchToManual,
  lang
}: QrCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorchCapability, setHasTorchCapability] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Play a pleasant audio chirp on successful scan
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12); // E6 note

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(lang === 'ar' 
        ? 'المتصفح مش بيسمح باستخدام الكاميرا بالطريقة دي. تقدر ترفع صورة فيها كود QR بدل كده.' 
        : 'Camera access is not supported in this environment. You can upload a QR image.');
      setHasPermission(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities && capabilities.torch) {
          setHasTorchCapability(true);
        } else {
          setHasTorchCapability(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setHasPermission(true);
      startScanningLoop();
    } catch (err: any) {
      console.warn('Camera access warning:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(lang === 'ar' 
          ? 'إذن الكاميرا اترفض. فعّل الإذن من إعدادات المتصفح أو ارفع صورة للكود.' 
          : 'Camera permission denied. Please allow camera in browser settings or upload a QR image.');
      } else {
        setCameraError(lang === 'ar' 
          ? 'مش قادرين نشغّل الكاميرا دلوقتي. تقدر ترفع صورة أو تكتب الكود السري بنفسك.' 
          : 'Could not activate camera. You can upload an image or type the code manually.');
      }
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  // Switch Facing Camera (Front / Back)
  const flipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Real-time video frame scanning loop
  const startScanningLoop = () => {
    const scanFrame = () => {
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleSuccessfulScan(code.data);
            return; // Stop loop once detected
          }
        } catch (e) {
          // Frame decode skip
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);
  };

  // Handle detection from camera or file
  const handleSuccessfulScan = (rawString: string) => {
    playScanBeep();
    const cleanCode = extractSecretCodeFromInput(rawString);
    setScannedCode(cleanCode || rawString);
    stopCamera();

    // Trigger parent callback
    setTimeout(() => {
      onCodeDetected(cleanCode || rawString);
    }, 450);
  };

  // Scan from photo / uploaded image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessingFile(false);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          setIsProcessingFile(false);

          if (code && code.data) {
            handleSuccessfulScan(code.data);
          } else {
            setCameraError(lang === 'ar' 
              ? 'ملقيناش كود QR واضح في الصورة. اختار صورة أوضح وجرّب تاني.' 
              : 'No readable QR code found in this photo. Please try a clearer image.');
          }
        } catch (err) {
          setIsProcessingFile(false);
          setCameraError(lang === 'ar' ? 'حصلت مشكلة وإحنا بنفحص الصورة.' : 'Error processing image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  return (
    <div className="space-y-4 text-center" dir="rtl">
      {/* Hidden file input for image upload fallback */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Viewfinder Frame */}
      <div className="relative w-full max-w-sm mx-auto aspect-square bg-slate-950 rounded-3xl overflow-hidden border-2 border-[var(--color-church-blue)] shadow-xl flex items-center justify-center">
        {/* Live Video Stream */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${scannedCode ? 'filter blur-xs' : ''}`}
          muted
          playsInline
        />

        {/* Success Overlay when detected */}
        {scannedCode ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mb-3 animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <h4 className="text-lg font-black text-emerald-200">
              {lang === 'ar' ? 'الكود اتقري بنجاح!' : 'QR Code Detected!'}
            </h4>
            <p className="font-mono font-bold text-xl text-white mt-1 tracking-widest bg-black/40 px-3 py-1 rounded-xl border border-emerald-400/30">
              {scannedCode}
            </p>
            <span className="text-xs text-emerald-300/90 mt-2 font-medium">
              {lang === 'ar' ? 'بنتأكد من حساب الطفل...' : 'Verifying student identity...'}
            </span>
          </motion.div>
        ) : (
          <>
            {/* Viewfinder Target Box and Animated Laser Scanner */}
            <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-white/40 rounded-2xl pointer-events-none flex items-center justify-center">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

              {/* Laser Scanline */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse" 
                   style={{
                     animation: 'scanLineAnim 2.2s ease-in-out infinite'
                   }}
              />
            </div>

            {/* Instruction badge inside viewfinder */}
            <div className="absolute bottom-3 inset-x-4 pointer-events-none">
              <span className="bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/20 inline-block shadow-sm">
                {lang === 'ar' ? 'وجّه الكاميرا ناحية كود QR اللي ظاهر على شاشة موبايل ابنك.' : 'Aim camera at your child’s QR code screen'}
              </span>
            </div>
          </>
        )}

        {/* Controls Overlay on Top of Viewfinder */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto">
          {/* Flip Camera Button */}
          <button
            type="button"
            onClick={flipCamera}
            title={lang === 'ar' ? 'بدّل الكاميرا' : 'Switch Camera'}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer border border-white/20"
          >
            <RefreshCw size={18} />
          </button>

          {/* Torch toggle if hardware supported */}
          {hasTorchCapability && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer border border-white/20 ${
                torchOn ? 'bg-amber-400 text-amber-950 font-bold' : 'bg-black/60 text-white hover:bg-black/80'
              }`}
            >
              <Flashlight size={18} />
            </button>
          )}

          {/* Photo upload fallback button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={lang === 'ar' ? 'ارفع صورة لكود QR' : 'Upload QR Image'}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer border border-white/20"
          >
            <ImageIcon size={18} />
          </button>
        </div>

        {/* Loading overlay for image processing */}
        {isProcessingFile && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-white">
            <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-bold">{lang === 'ar' ? 'بنفحص الصورة...' : 'Processing image...'}</span>
          </div>
        )}
      </div>

      {/* Error / Fallback Banner */}
      {cameraError && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 text-xs text-amber-950 flex items-start gap-2 text-start">
          <AlertCircle size={17} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <p className="leading-relaxed font-medium">{cameraError}</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload size={13} />
                <span>{lang === 'ar' ? 'اختار صورة فيها كود QR' : 'Upload QR Photo'}</span>
              </button>

              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'جرّب تاني' : 'Retry Camera'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Demo Quick-Scan Helper (For instant testing without needing 2 physical phones) */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-blue-950 text-start">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--color-church-blue)] shrink-0" />
          <span>
            {lang === 'ar' 
              ? 'تجربة سريعة: جرّب تمسح حساب تجريبي (ديفيد / مينا).' 
              : 'Quick test: Simulate scanning child QR (David / Mina)'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleSuccessfulScan('ST-4921')}
            className="px-2.5 py-1 rounded-xl bg-white hover:bg-blue-100 border border-blue-300 font-bold text-[11px] text-[var(--color-church-blue)] transition-colors cursor-pointer shadow-2xs"
          >
            David (ST-4921)
          </button>
          <button
            type="button"
            onClick={() => handleSuccessfulScan('CH-9481')}
            className="px-2.5 py-1 rounded-xl bg-white hover:bg-blue-100 border border-blue-300 font-bold text-[11px] text-[var(--color-church-blue)] transition-colors cursor-pointer shadow-2xs"
          >
            Mina (CH-9481)
          </button>
        </div>
      </div>

      {/* Alternative to QR: Switch to Manual Code Entry */}
      {onSwitchToManual && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onSwitchToManual}
            className="text-xs text-[var(--color-church-blue)] hover:underline font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound size={14} />
            <span>{lang === 'ar' ? 'أو اكتب الكود السري بنفسك (ST-4921)' : 'Or type alphanumeric secret code'}</span>
          </button>
        </div>
      )}

      {/* Inline animation keyframe style */}
      <style>{`
        @keyframes scanLineAnim {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}
