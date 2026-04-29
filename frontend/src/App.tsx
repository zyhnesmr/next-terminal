import { useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MainArea } from './components/layout/MainArea';
import { TitleBar } from './components/layout/TitleBar';
import { MfaPrompt } from './components/connection/MfaPrompt';
import { useSettingsStore } from './stores/settingsStore';
import { applyTheme } from './themes';
import { EventsOn, EventsOff } from '../wailsjs/runtime/runtime';

interface MfaChallenge {
  sessionId: string;
  user: string;
  instruction: string;
  prompts: Array<{
    name: string;
    instruction: string;
    prompt: string;
    echo: boolean;
  }>;
}

function App() {
  const { loadSettings, settings } = useSettingsStore();
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Listen for MFA challenges
  useEffect(() => {
    EventsOn('auth:mfa-required', (data: any) => {
      setMfaChallenge({
        sessionId: data.sessionId,
        user: data.user || '',
        instruction: data.instruction || '',
        prompts: data.prompts || [],
      });
    });

    return () => {
      EventsOff('auth:mfa-required');
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <div className="w-64 shrink-0 border-r" style={{ borderColor: 'var(--border)' }}>
          <Sidebar />
        </div>
        <MainArea />
      </div>

      {mfaChallenge && (
        <MfaPrompt
          sessionId={mfaChallenge.sessionId}
          user={mfaChallenge.user}
          instruction={mfaChallenge.instruction}
          prompts={mfaChallenge.prompts}
          onClose={() => setMfaChallenge(null)}
        />
      )}
    </div>
  );
}

export default App;
