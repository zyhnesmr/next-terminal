import React from 'react';
import { useTerminalStore } from '../../stores/terminalStore';
import { X, Terminal, Loader2 } from 'lucide-react';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTerminalStore();

  if (tabs.length === 0) return null;

  return (
    <div
      className="flex items-center h-9 overflow-x-auto"
      style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className="flex items-center gap-1.5 px-3 h-full text-xs cursor-pointer border-r whitespace-nowrap"
          style={{
            backgroundColor: tab.id === activeTabId ? 'var(--tab-active)' : 'var(--tab-inactive)',
            borderColor: 'var(--border)',
            color: tab.id === activeTabId ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.connecting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Terminal size={12} />
          )}
          <span className="font-medium">{tab.connectionName}</span>
          <button
            className="ml-1 p-0.5 rounded opacity-60 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}
