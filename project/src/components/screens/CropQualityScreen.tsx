import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ImagePlus, Loader2, RefreshCcw, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { analyzeCropImage, type CropQualityResult } from '../../services/cropQualityService';

export function CropQualityScreen({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [result, setResult] = useState<CropQualityResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Camera permission was not granted.');
    }
  }, []);

  useEffect(() => {
    void startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [startCamera]);

  const analyzeFile = async (file: File) => {
    setAnalyzing(true);
    setCameraError('');
    setResult(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    try {
      setResult(await analyzeCropImage(file));
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'The image could not be analyzed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setCameraError('Camera preview is not ready yet. Please wait a moment.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) void analyzeFile(new File([blob], 'crop-capture.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-surface">
      <div className="mx-auto min-h-screen max-w-2xl px-4 pb-8 pt-4 sm:px-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-deep">My Produce</p>
            <h1 className="text-2xl font-extrabold text-ink">Check Crop Quality</h1>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-card text-ink-soft" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!result && (
          <>
            <Card className="mb-4 overflow-hidden p-0">
              <div className="relative aspect-[4/3] bg-ink">
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                {!streamRef.current && <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm font-semibold text-white/80">Allow camera access to capture your crop.</div>}
                {analyzing && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/60 text-white"><Loader2 size={30} className="animate-spin" /><span className="text-sm font-semibold">Assessing image…</span></div>}
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                <Button onClick={capturePhoto} disabled={analyzing} size="lg"><Camera size={18} /> Capture photo</Button>
                <Button onClick={() => fileInputRef.current?.click()} disabled={analyzing} size="lg" variant="outline"><ImagePlus size={18} /> Upload image</Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={event => {
                const file = event.target.files?.[0];
                if (file) void analyzeFile(file);
                event.target.value = '';
              }} />
            </Card>
            {cameraError && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-warning">{cameraError}</p>}
            <p className="text-center text-xs leading-relaxed text-ink-soft">Take a clear photo in daylight with the produce filling most of the frame. You can also choose an existing crop image.</p>
          </>
        )}

        {result && (
          <div className="animate-fade-in">
            {previewUrl && <img src={previewUrl} alt="Captured crop for assessment" className="mb-4 max-h-64 w-full rounded-3xl object-cover shadow-card" />}
            <Card className="mb-3 border-brand-mid/20">
              <div className="flex items-center gap-3">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${result.label === 'GOOD' ? 'bg-brand-soft text-brand-deep' : result.label === 'FAIR' ? 'bg-market-soft text-market-deep' : 'bg-red-50 text-warning'}`}>
                  <CheckCircle2 size={30} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Visual quality estimate</p>
                  <p className="text-2xl font-extrabold text-ink">{result.label}</p>
                </div>
                <div className="ml-auto text-right"><p className="text-3xl font-extrabold text-brand-deep">{result.score}</p><p className="text-xs text-ink-soft">out of 100</p></div>
              </div>
            </Card>
            <Card className="mb-3">
              <div className="mb-3 flex items-center gap-2"><Sparkles size={18} className="text-brand-deep" /><h2 className="font-bold text-ink">Detected observations</h2></div>
              <ul className="space-y-2">{result.issues.map(issue => <li key={issue} className="flex gap-2 text-sm leading-relaxed text-ink-soft"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-mid" />{issue}</li>)}</ul>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card><p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-soft">Recommended action</p><p className="text-sm leading-relaxed text-ink">{result.recommendedAction}</p></Card>
              <Card><p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-soft">Storage / handling</p><p className="text-sm leading-relaxed text-ink">{result.storageSuggestion}</p></Card>
            </div>
            <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">{result.analysisNote}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setResult(null);
                setPreviewUrl('');
                void startCamera();
              }}><RefreshCcw size={17} /> New photo</Button>
              <Button size="lg" onClick={onClose}>Back to dashboard</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}