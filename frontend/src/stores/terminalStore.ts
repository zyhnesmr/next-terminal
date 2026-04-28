import { create } from 'zustand';
import { StartSession, CloseSession } from '../../wailsjs/go/app/App';

interface TerminalTab {
  id: string;
  connectionId: string;
  connectionName: string;
  host: string;
  sessionId: string | null;
  active: boolean;
  connecting: boolean;
  error: string | null;
}

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;

  openTab: (connectionId: string, connectionName: string, host: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: async (connectionId, connectionName, host) => {
    const tabId = crypto.randomUUID();

    // Add tab in connecting state
    const tab: TerminalTab = {
      id: tabId,
      connectionId,
      connectionName,
      host,
      sessionId: null,
      active: true,
      connecting: true,
      error: null,
    };

    set({ tabs: [...get().tabs, tab], activeTabId: tabId });

    try {
      const sessionId = await StartSession(connectionId);
      set({
        tabs: get().tabs.map((t) =>
          t.id === tabId ? { ...t, sessionId, connecting: false } : t
        ),
      });
    } catch (e: any) {
      set({
        tabs: get().tabs.map((t) =>
          t.id === tabId ? { ...t, connecting: false, error: e.toString() } : t
        ),
      });
    }
  },

  closeTab: (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (tab?.sessionId) {
      CloseSession(tab.sessionId).catch(() => {});
    }
    const tabs = get().tabs.filter((t) => t.id !== tabId);
    const activeTabId = get().activeTabId === tabId
      ? (tabs.length > 0 ? tabs[tabs.length - 1].id : null)
      : get().activeTabId;
    set({ tabs, activeTabId });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),
}));
