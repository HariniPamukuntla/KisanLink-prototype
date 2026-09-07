interface WaveformProps {
  active: boolean;
  bars?: number;
}

export function Waveform({ active, bars = 5 }: WaveformProps) {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full bg-brand-light ${active ? 'animate-wave' : ''}`}
          style={{
            height: active ? '100%' : '20%',
            animationDelay: active ? `${i * 0.12}s` : undefined,
            opacity: active ? 1 : 0.3,
            transition: 'opacity 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}
