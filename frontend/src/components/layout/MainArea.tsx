import React from 'react';
import { useTerminalStore } from '../../stores/terminalStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { TabBar } from './TabBar';
import { XtermTerminal } from '../terminal/XtermTerminal';
import { SftpPanel } from '../sftp/SftpPanel';
import { dracula } from '../../themes/dracula';
import { Terminal as TerminalIcon, AlertCircle, Loader2 } from 'lucide-react';

export function MainArea() {
  const { tabs, activeTabId } = useTerminalStore();
  const { settings } = useSettingsStore();

  const xtermTheme = dracula.xterm;

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TabBar />

      {tabs.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <div className="flex-1 relative">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{ display: tab.id === activeTabId ? 'flex' : 'none' }}
            >
              {tab.connecting && (
                <div className="flex items-center justify-center w-full h-full" style={{ color: 'var(--text-secondary)' }}>
                  <div className="text-center">
                    <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Connecting to {tab.host}...</p>
                  </div>
                </div>
              )}
              {tab.error && (
                <div className="flex items-center justify-center w-full h-full" style={{ color: 'var(--danger)' }}>
                  <div className="text-center max-w-sm px-4">
                    <AlertCircle size={24} className="mx-auto mb-2" />
                    <p className="text-sm font-medium">Connection Failed</p>
                    <p className="text-xs mt-1 opacity-70">{tab.error}</p>
                  </div>
                </div>
              )}
              {tab.type === 'sftp' && tab.explorerId && !tab.connecting && !tab.error && (
                <SftpPanel
                  explorerId={tab.explorerId}
                  onClose={() => {}}
                />
              )}
              {tab.type === 'terminal' && tab.sessionId && !tab.connecting && !tab.error && (
                <XtermTerminal
                  sessionId={tab.sessionId}
                  theme={xtermTheme}
                  fontSize={settings.fontSize}
                  fontFamily={settings.fontFamily}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-secondary)' }}>
      <div className="text-center">
        <TerminalIcon size={48} className="mx-auto mb-4 opacity-20" />
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          next-terminal
        </h2>
        <p className="text-sm opacity-60">
          Select a connection from the sidebar to begin
        </p>
      </div>
    </div>
  );
}
