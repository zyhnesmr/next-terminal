import { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MainArea } from './components/layout/MainArea';
import { TitleBar } from './components/layout/TitleBar';
import { useSettingsStore } from './stores/settingsStore';
import { applyTheme } from './themes';

function App() {
  const { loadSettings, settings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <div className="w-64 shrink-0 border-r" style={{ borderColor: 'var(--border)' }}>
          <Sidebar />
        </div>
        <MainArea />
      </div>
    </div>
  );
}

export default App;
