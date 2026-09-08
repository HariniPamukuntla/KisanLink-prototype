import { Home, Mic, Calculator, Users, UsersRound, History } from 'lucide-react';
import type { ScreenTab } from '../../types';
import { useApp } from '../../AppContext';

const TABS: { id: ScreenTab; icon: typeof Home; key: string }[] = [
  { id: 'home', icon: Home, key: 'home' },
  { id: 'voice', icon: Mic, key: 'voice' },
  { id: 'advisor', icon: Calculator, key: 'advisor' },
  { id: 'buyers', icon: Users, key: 'buyers' },
  { id: 'groups', icon: UsersRound, key: 'groups' },
  { id: 'history', icon: History, key: 'history' },
];

export function BottomNav() {
  const { activeTab, setActiveTab, t } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-card border-t border-line shadow-nav safe-bottom">
      <div className="max-w-2xl mx-auto flex items-stretch overflow-x-auto">
        {TABS.map(({ id, icon: Icon, key }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
                active ? 'text-brand-deep' : 'text-ink-faint'
              }`}
            >
              <div
                className={`w-12 h-8 rounded-2xl flex items-center justify-center transition-all ${
                  active ? 'bg-brand-soft' : ''
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? 'text-brand-deep' : 'text-ink-faint'}
                />
              </div>
              <span className={`text-[11px] font-semibold ${active ? 'text-brand-deep' : 'text-ink-faint'}`}>
                {t(key)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
