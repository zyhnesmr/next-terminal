import { create } from 'zustand';
import { StartSession, CloseSession, OpenSftpExplorer } from '../../wailsjs/go/app/App';

type TabType = 'terminal' | 'sftp';

interface TerminalTab {
  id: string;
  connectionId: string;
  connectionName: string;
  host: string;
  sessionId: string | null;
  explorerId: string | null;
  type: TabType;
  connecting: boolean;
  error: string | null;
}

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;

  openTab: (connectionId: string, connectionName: string, host: string) => Promise<void>;
  openSftpTab: (connectionId: string, connectionName: string, host: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: async (connectionId, connectionName, host) => {
    const tabId = crypto.randomUUID();

    const tab: TerminalTab = {
      id: tabId,
      connectionId,
      connectionName,
      host,
      sessionId: null,
      explorerId: null,
      type: 'terminal',
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

  openSftpTab: async (connectionId, connectionName, host) => {
    const tabId = crypto.randomUUID();

    const tab: TerminalTab = {
      id: tabId,
      connectionId,
      connectionName,
      host,
      sessionId: null,
      explorerId: null,
      type: 'sftp',
      connecting: true,
      error: null,
    };

    set({ tabs: [...get().tabs, tab], activeTabId: tabId });

    try {
      // Need an SSH session first, then open SFTP on it
      const sessionId = await StartSession(connectionId);
      set({
        tabs: get().tabs.map((t) =>
          t.id === tabId ? { ...t, sessionId } : t
        ),
      });

      const explorerId = await OpenSftpExplorer(sessionId);
      set({
        tabs: get().tabs.map((t) =>
          t.id === tabId ? { ...t, explorerId, connecting: false } : t
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
