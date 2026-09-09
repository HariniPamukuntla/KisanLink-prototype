import { useState } from 'react';
import { Phone, X, ChevronRight, ShieldCheck, Languages, Users, Wheat, MessageCircle } from 'lucide-react';

export function VoiceAccessPromo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 w-full overflow-hidden rounded-2xl border border-brand-mid/25 bg-brand-light/70 text-left"
        aria-label="Learn about KisanLink toll-free voice access"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-mid text-white">
            <Phone size={19} />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="whitespace-nowrap font-extrabold text-brand-deep">
              <span className="inline-block voice-marquee">
                📞 KisanLink Toll-Free Voice Access&nbsp;&nbsp; • &nbsp;&nbsp;No smartphone? No problem.&nbsp;&nbsp; • &nbsp;&nbsp;🗣 Local language&nbsp;&nbsp; • &nbsp;&nbsp;🌾 Find buyers&nbsp;&nbsp; • &nbsp;&nbsp;🤝 Connect with buyers&nbsp;&nbsp; • &nbsp;&nbsp;
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">Tap to learn how farmers can use KisanLink by phone.</p>
          </div>
          <ChevronRight size={19} className="shrink-0 text-brand-mid" />
        </div>
      </button>

      <style>{`
        @keyframes kisanlinkVoiceMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-55%); }
        }
        .voice-marquee {
          animation: kisanlinkVoiceMarquee 16s linear infinite;
        }
      `}</style>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-mid text-white">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-mid">Accessibility</p>
                  <h2 className="text-lg font-extrabold text-brand-deep">KisanLink Toll-Free Voice Access</h2>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-ink-soft hover:bg-surface-alt" aria-label="Close">
                <X size={22} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-2xl bg-brand-light p-4">
                <h3 className="text-xl font-extrabold text-brand-deep">No smartphone? No problem.</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  KisanLink can be extended to a toll-free IVR/voice service so farmers who do not use smartphones can still access the marketplace by making a phone call.
                </p>
              </div>

              <div>
                <h3 className="mb-3 font-extrabold text-ink">How it works</h3>
                <div className="space-y-3">
                  {[
                    [Phone, 'Call the KisanLink toll-free number', 'No app or smartphone is required.'],
                    [Languages, 'Choose a local language', 'For example: Telugu, Hindi or English.'],
                    [Wheat, 'Tell KisanLink about your crop', 'Crop, quantity and quality can be provided through the voice menu.'],
                    [Users, 'Find matching buyers', 'The request is matched against registered buyer demand.'],
                    [MessageCircle, 'Connect and send a request', 'The farmer can choose a buyer and create a connection request.'],
                  ].map(([Icon, title, text]) => (
                    <div key={title as string} className="flex gap-3 rounded-2xl border border-line p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-mid">
                        <Icon size={19} />
                      </div>
                      <div>
                        <p className="font-bold text-ink">{title as string}</p>
                        <p className="mt-0.5 text-xs leading-5 text-ink-soft">{text as string}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-brand-mid/20 bg-surface-alt p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand-mid" />
                  <div>
                    <p className="font-extrabold text-ink">Same KisanLink marketplace</p>
                    <p className="mt-1 text-sm leading-6 text-ink-soft">
                      The phone channel is an accessibility layer. It uses the same farmer, buyer, matching and connection-request backend as the web application.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-line p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">SIH concept</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink">
                  “The innovation is not simply a toll-free number. It is extending the farmer-buyer marketplace to farmers who cannot depend on a smartphone.”
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-2xl bg-brand-mid px-5 py-3.5 font-extrabold text-white"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
