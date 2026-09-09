import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import { useApp } from '../../AppContext';
import { assessCropQuality, CropQualityServiceError } from '../../services/cropQualityService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { CropQualityResult } from '../../types';

export function QuickCropQualityScreen({ onClose }: { onClose: () => void }) {
  const { profile, setProduce, addHistory } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult] = useState<CropQualityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => previews.forEach(url => URL.revokeObjectURL(url)), [previews]);
  if (!profile?.produce) return null;
  const addImages = (selected: File[]) => {
    setError('');
    const images = selected.filter(file => file.type.startsWith('image/')).slice(0, 2 - files.length);
    if (!images.length) return;
    setFiles(previous => [...previous, ...images]);
    setPreviews(previous => [...previous, ...images.map(file => URL.createObjectURL(file))]);
  };
  const remove = (index: number) => { URL.revokeObjectURL(previews[index]); setFiles(previous => previous.filter((_, i) => i !== index)); setPreviews(previous => previous.filter((_, i) => i !== index)); };
  const assess = async () => {
    if (files.length !== 2) { setError('Please add exactly 2 crop pictures.'); return; }
    setBusy(true); setError('');
    try {
      const p = profile.produce;
      const assessment = await assessCropQuality({ cropName: p.cropName, variety: p.variety || '', harvestDate: p.harvestDate || new Date().toISOString().slice(0, 10), quantityQuintals: p.quantityQuintals, storageCondition: 'Good', storageLocation: 'Farmer storage', handlingNotes: '', images: files });
      setResult(assessment);
      setProduce({ ...p, grade: assessment.grade });
      addHistory({ type: 'quality', title: `${p.cropName} Crop Quality`, summary: `Grade ${assessment.grade} · ${assessment.score}/100 · 2 photos`, result: assessment.sellingRecommendation, details: [assessment.reasoning, ...assessment.visibleObservations.slice(0, 3)] });
    } catch (e) { setError(e instanceof CropQualityServiceError ? e.message : 'Quality assessment could not be completed.'); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-surface"><div className="mx-auto min-h-screen max-w-2xl px-4 py-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-deep">Farmer dashboard</p><h1 className="text-2xl font-extrabold text-ink">Crop Quality Check</h1><p className="mt-1 text-sm text-ink-soft">{profile.produce.cropName} · Upload exactly 2 clear pictures.</p></div><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-card"><X size={20}/></button></div>{result?<><Card className="mb-3"><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep"><CheckCircle2 size={30}/></div><div><p className="text-xs font-bold uppercase text-ink-soft">Quality result</p><p className="text-2xl font-extrabold text-ink">Grade {result.grade}</p></div><p className="ml-auto text-3xl font-extrabold text-brand-deep">{result.score}<span className="text-xs text-ink-soft">/100</span></p></div><p className="mt-3 text-sm text-ink-soft">{result.reasoning}</p></Card><Card className="mb-4"><p className="font-bold text-ink">Selling recommendation</p><p className="mt-2 text-sm leading-relaxed text-ink-soft">{result.sellingRecommendation}</p></Card><Button fullWidth size="lg" onClick={onClose}>Back to dashboard</Button></>:<><Card className="mb-4"><div className="grid grid-cols-2 gap-3">{previews.map((preview,index)=><div key={preview} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-alt"><img src={preview} alt={`Crop photo ${index+1}`} className="h-full w-full object-cover"/><button onClick={()=>remove(index)} className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-1 text-xs text-white">Remove</button></div>)}{previews.length<2&&<button onClick={()=>inputRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface-alt text-sm font-bold text-ink-soft"><ImagePlus size={26}/>{previews.length?'Add second photo':'Add photos'}</button>}</div><input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>{addImages(Array.from(e.target.files||[]));e.target.value='';}}/><div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" onClick={()=>inputRef.current?.click()} disabled={files.length>=2}><ImagePlus size={17}/> Upload</Button><Button onClick={onClose} variant="outline">Cancel</Button></div></Card><p className="mb-3 text-center text-xs text-ink-soft">Two clear photos are enough: one full crop view and one close-up.</p>{error&&<p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-warning">{error}</p>}<Button fullWidth size="lg" disabled={files.length!==2||busy} onClick={()=>void assess()}>{busy?<Loader2 size={18} className="animate-spin"/>:<Sparkles size={18}/>} {busy?'Analyzing…':'Check crop quality'}</Button></>}</div></div>;
}
