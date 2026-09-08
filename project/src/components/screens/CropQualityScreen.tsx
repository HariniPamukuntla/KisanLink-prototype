import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, ImagePlus, Loader2, RefreshCcw, Sparkles, X, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { useApp } from '../../AppContext';
import { assessCropQuality, CropQualityServiceError } from '../../services/cropQualityService';
import type { CropQualityResult } from '../../types';

type Details = {
  cropName: string;
  variety: string;
  harvestDate: string;
  quantityQuintals: string;
  storageCondition: string;
  storageLocation: string;
  handlingNotes: string;
};

const INITIAL_DETAILS: Details = {
  cropName: '',
  variety: '',
  harvestDate: '',
  quantityQuintals: '',
  storageCondition: 'Good',
  storageLocation: '',
  handlingNotes: '',
};

async function fileHash(file: File) {
  const bytes = await file.arrayBuffer();
  if (crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function CropQualityScreen({ onClose }: { onClose: () => void }) {
  const { t, buyers, addHistory, setProduce } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [details, setDetails] = useState<Details>(INITIAL_DETAILS);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult] = useState<CropQualityResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [error, setError] = useState('');
  const [historySaved, setHistorySaved] = useState(false);
  const previewsRef = useRef<string[]>([]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported in this browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (cameraIssue) {
      setCameraError(cameraIssue instanceof Error ? cameraIssue.message : 'Camera permission was not granted.');
    }
  }, []);

  useEffect(() => {
    if (step === 2 && !result) void startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [result, startCamera, step]);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => () => {
    previewsRef.current.forEach(url => URL.revokeObjectURL(url));
  }, []);

  const updateDetails = (key: keyof Details, value: string) => {
    setDetails(previous => ({ ...previous, [key]: value }));
    setError('');
  };

  const addFiles = async (selected: File[]) => {
    setError('');
    const imageFiles = selected.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== selected.length) {
      setError('Only image files can be added. Video analysis is not supported.');
    }
    if (files.length + imageFiles.length > 10) {
      setError('You can add up to 10 images. Remove one before adding another.');
      return;
    }

    const existingHashes = new Set<string>();
    for (const file of files) existingHashes.add(await fileHash(file));
    const unique: File[] = [];
    for (const file of imageFiles) {
      const hash = await fileHash(file);
      if (existingHashes.has(hash) || unique.some(candidate => candidate.name === file.name && candidate.size === file.size)) {
        setError('Duplicate images were skipped. Add a different angle or view of the crop.');
        continue;
      }
      existingHashes.add(hash);
      unique.push(file);
    }
    if (!unique.length) return;
    setFiles(previous => [...previous, ...unique]);
    setPreviews(previous => [...previous, ...unique.map(file => URL.createObjectURL(file))]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(previous => previous.filter((_, itemIndex) => itemIndex !== index));
    setPreviews(previous => previous.filter((_, itemIndex) => itemIndex !== index));
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
      if (blob) void addFiles([new File([blob], `crop-capture-${Date.now()}.jpg`, { type: 'image/jpeg' })]);
    }, 'image/jpeg', 0.9);
  };

  const detailsReady = Boolean(
    details.cropName.trim() &&
    details.harvestDate &&
    Number(details.quantityQuintals) > 0 &&
    details.storageCondition &&
    details.storageLocation.trim()
  );

  const matchedBuyers = useMemo(() => {
    if (!result) return [];
    return buyers
      .filter(buyer => buyer.grade === result.grade || (result.grade === 'B' && buyer.grade === 'A'))
      .sort((a, b) => Number(b.grade === result.grade) - Number(a.grade === result.grade) || b.trust.trustScore - a.trust.trustScore)
      .slice(0, 3);
  }, [buyers, result]);

  const handleAssess = async () => {
    if (files.length < 4) {
      setError('Add at least 4 different crop images before assessing quality.');
      return;
    }
    setAnalyzing(true);
    setError('');
    try {
      const assessment = await assessCropQuality({
        ...details,
        quantityQuintals: Number(details.quantityQuintals),
        images: files,
      });
      setResult(assessment);
      setProduce({
        cropName: details.cropName,
        quantityQuintals: Number(details.quantityQuintals),
        grade: assessment.grade,
      });
    } catch (assessmentError) {
      setError(assessmentError instanceof CropQualityServiceError ? assessmentError.message : 'The quality assessment could not be completed.');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!result || historySaved) return;
    addHistory({
      type: 'quality',
      title: `${details.cropName} ${t('cropQuality')}`,
      summary: `${t('grade')} ${result.grade} · ${result.score}/100 · ${files.length} ${t('photosAdded')}`,
      result: `${t('grade')} ${result.grade}: ${result.sellingRecommendation}`,
      details: [
        `${t('harvestDate')}: ${details.harvestDate}`,
        `${t('amount')}: ${details.quantityQuintals}`,
        result.reasoning,
        ...result.visibleObservations.slice(0, 3),
      ],
    });
    setHistorySaved(true);
  }, [addHistory, details, files.length, historySaved, result, t]);

  const reset = () => {
    previews.forEach(url => URL.revokeObjectURL(url));
    setStep(1);
    setDetails(INITIAL_DETAILS);
    setFiles([]);
    setPreviews([]);
    setResult(null);
    setError('');
    setHistorySaved(false);
  };

  const gradeStyle = result?.grade === 'A'
    ? 'bg-brand-soft text-brand-deep'
    : result?.grade === 'B'
      ? 'bg-market-soft text-market-deep'
      : 'bg-red-50 text-warning';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-surface">
      <div className="mx-auto min-h-screen max-w-2xl px-4 pb-8 pt-4 sm:px-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-deep">{t('cropQuality')}</p>
            <h1 className="text-2xl font-extrabold text-ink">{t('cropDetails')}</h1>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-card text-ink-soft" aria-label={t('close')}>
            <X size={20} />
          </button>
        </div>

        {!result && step === 1 && (
          <Card className="space-y-3">
            <h2 className="text-base font-bold text-ink">{t('cropDetails')}</h2>
            <Field label={t('cropName')} value={details.cropName} onChange={value => updateDetails('cropName', value)} required />
            <Field label={t('variety')} value={details.variety} onChange={value => updateDetails('variety', value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('harvestDate')} value={details.harvestDate} onChange={value => updateDetails('harvestDate', value)} type="date" required />
              <Field label={t('amount')} value={details.quantityQuintals} onChange={value => updateDetails('quantityQuintals', value.replace(/[^\d.]/g, ''))} type="number" min="0.1" step="0.1" required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label={t('storageCondition')} value={details.storageCondition} onChange={value => updateDetails('storageCondition', value)} options={['Good', 'Average', 'Poor']} />
              <Field label={t('storageLocation')} value={details.storageLocation} onChange={value => updateDetails('storageLocation', value)} placeholder="e.g. ventilated shed" required />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-ink-soft">{t('handlingNotes')}</span>
              <textarea value={details.handlingNotes} onChange={event => updateDetails('handlingNotes', event.target.value)} rows={3} placeholder="Sorting, packing, or damage notes" className="w-full resize-none rounded-2xl border border-line bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-mid" />
            </label>
            <p className="rounded-2xl bg-surface-alt px-3 py-2 text-xs leading-relaxed text-ink-soft">The assessor uses these details together with all submitted images. It does not analyze video or diagnose disease.</p>
            <Button fullWidth size="lg" onClick={() => setStep(2)} disabled={!detailsReady}>{t('continueToPhotos')} <ImagePlus size={18} /></Button>
          </Card>
        )}

        {!result && step === 2 && (
          <>
            <Card className="mb-4 overflow-hidden p-0">
              <div className="relative aspect-[4/3] bg-ink">
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                {!streamRef.current && <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm font-semibold text-white/80">{cameraError || 'Allow camera access to capture a crop photo.'}</div>}
                {analyzing && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/60 text-white"><Loader2 size={30} className="animate-spin" /><span className="text-sm font-semibold">{t('thinking')}</span></div>}
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                <Button onClick={capturePhoto} disabled={analyzing || files.length >= 10} size="lg"><Camera size={18} /> Capture photo</Button>
                <Button onClick={() => fileInputRef.current?.click()} disabled={analyzing || files.length >= 10} size="lg" variant="outline"><ImagePlus size={18} /> Upload images</Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={event => {
                void addFiles(Array.from(event.target.files || []));
                event.target.value = '';
              }} />
            </Card>
            <Card className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-bold text-ink">{t('addPhotos')}</h2>
                <Chip tone={files.length >= 4 ? 'brand' : 'neutral'}>{files.length}/10</Chip>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-ink-soft">{t('photoGuidance')}</p>
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((preview, index) => (
                    <div key={preview} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-alt">
                      <img src={preview} alt={`Crop image ${index + 1}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeFile(index)} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-white" aria-label={t('removePhoto')}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-warning">{error}</p>}
            {cameraError && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-warning">{cameraError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" onClick={() => setStep(1)} disabled={analyzing}>Back</Button>
              <Button size="lg" onClick={() => void handleAssess()} disabled={files.length < 4 || analyzing}>{analyzing ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />} {t('assessQuality')}</Button>
            </div>
          </>
        )}

        {result && (
          <div className="animate-fade-in">
            <Card className="mb-3 border-brand-mid/20">
              <div className="flex items-center gap-3">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${gradeStyle}`}><CheckCircle2 size={30} /></div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t('cropQuality')}</p>
                  <p className="text-2xl font-extrabold text-ink">{t('grade')} {result.grade}</p>
                </div>
                <div className="ml-auto text-right"><p className="text-3xl font-extrabold text-brand-deep">{result.score}</p><p className="text-xs text-ink-soft">out of 100</p></div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-soft">Confidence: {result.confidence}. Based on {files.length} images and the details you provided.</p>
            </Card>
            <Card className="mb-3">
              <div className="mb-3 flex items-center gap-2"><Sparkles size={18} className="text-brand-deep" /><h2 className="font-bold text-ink">{t('qualityReasoning')}</h2></div>
              <p className="text-sm leading-relaxed text-ink-soft">{result.reasoning}</p>
              <p className="mt-3 text-sm font-semibold text-ink">{result.freshnessAssessment}</p>
              <ul className="mt-3 space-y-2">{result.visibleObservations.map(observation => <li key={observation} className="flex gap-2 text-sm leading-relaxed text-ink-soft"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-mid" />{observation}</li>)}</ul>
            </Card>
            <Card className="mb-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('recommendations')}</p>
              <ul className="space-y-2">{result.recommendations.map(recommendation => <li key={recommendation} className="flex gap-2 text-sm leading-relaxed text-ink"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-mid" />{recommendation}</li>)}</ul>
              <p className="mt-3 rounded-2xl bg-brand-soft px-3 py-2 text-sm font-semibold leading-relaxed text-brand-deep">{result.sellingRecommendation}</p>
            </Card>
            <Card className="mb-4">
              <p className="mb-2 text-sm font-bold text-ink">{t('matchedBuyersForGrade')}</p>
              {matchedBuyers.length === 0 ? <p className="text-sm text-ink-soft">{t('noMatches')}</p> : <div className="space-y-2">{matchedBuyers.map(buyer => <div key={buyer.id} className="flex items-center justify-between rounded-2xl bg-surface-alt px-3 py-2"><div><p className="text-sm font-bold text-ink">{buyer.name}</p><p className="text-xs text-ink-soft">{buyer.location} · Grade {buyer.grade}</p></div><p className="text-sm font-bold text-brand-deep">{buyer.trust.trustScore}/100</p></div>)}</div>}
            </Card>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" onClick={reset}><RefreshCcw size={17} /> New assessment</Button>
              <Button size="lg" onClick={onClose}>Back to dashboard</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-ink-soft">{label}{required && <span className="text-warning"> *</span>}</span>
      <input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} min={min} step={step} className="w-full rounded-2xl border border-line bg-surface-card px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand-mid" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-ink-soft">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-2xl border border-line bg-surface-card px-4 py-3 text-sm text-ink outline-none focus:border-brand-mid">
        {options.map(option => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}