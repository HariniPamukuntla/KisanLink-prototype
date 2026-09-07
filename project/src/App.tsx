import { AppProvider, useApp } from './AppContext';
import { LanguageSelect } from './components/LanguageSelect';
import { HomeScreen } from './components/screens/HomeScreen';
import { VoiceScreen } from './components/screens/VoiceScreen';
import { AdvisorScreen } from './components/screens/AdvisorScreen';
import { BuyersScreen } from './components/screens/BuyersScreen';
import { GroupsScreen } from './components/screens/GroupsScreen';
import { AdminScreen } from './components/screens/AdminScreen';
import { BottomNav } from './components/ui/BottomNav';

function AppContent() {
  const { authenticated, view, activeTab } = useApp();

  if (!authenticated) {
    return <LanguageSelect />;
  }

  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-surface">
        <div className="max-w-2xl mx-auto pt-2">
          <AdminScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto pt-2 pb-24">
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'voice' && <VoiceScreen />}
        {activeTab === 'advisor' && <AdvisorScreen />}
        {activeTab === 'buyers' && <BuyersScreen />}
        {activeTab === 'groups' && <GroupsScreen />}
      </div>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
