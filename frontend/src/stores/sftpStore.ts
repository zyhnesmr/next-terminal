import { create } from 'zustand';
import {
  OpenSftpExplorer,
  SftpListDir,
  SftpMkdir,
  SftpRemove,
  SftpRename,
  SftpUpload,
  SftpDownload,
  CloseSftpExplorer,
} from '../../wailsjs/go/app/App';
import { domain } from '../../wailsjs/go/models';
import { EventsOn } from '../../wailsjs/runtime/runtime';

type FileEntry = domain.FileEntry;

interface Transfer {
  id: string;
  explorerId: string;
  localPath: string;
  remotePath: string;
  isUpload: boolean;
  bytesTransferred: number;
  totalBytes: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

interface SftpExplorer {
  explorerId: string;
  sessionTabId: string;
  currentPath: string;
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  history: string[];
}

interface SftpState {
  explorers: Record<string, SftpExplorer>;
  transfers: Transfer[];

  openExplorer: (sessionTabId: string, sessionId: string) => Promise<string | null>;
  closeExplorer: (explorerId: string) => void;
  navigateTo: (explorerId: string, path: string) => Promise<void>;
  goUp: (explorerId: string) => Promise<void>;
  goBack: (explorerId: string) => Promise<void>;
  mkdir: (explorerId: string, path: string) => Promise<void>;
  remove: (explorerId: string, path: string) => Promise<void>;
  rename: (explorerId: string, oldPath: string, newPath: string) => Promise<void>;
  upload: (explorerId: string, localPath: string, remotePath: string) => Promise<void>;
  download: (explorerId: string, remotePath: string, localPath: string) => Promise<void>;
  getExplorer: (explorerId: string) => SftpExplorer | undefined;
}

let transferListenerSetup = false;

export const useSftpStore = create<SftpState>((set, get) => {
  if (!transferListenerSetup) {
    transferListenerSetup = true;
    EventsOn('sftp:transfer-progress', (data: any) => {
      const { explorerID, bytesTransferred, totalBytes, isUpload } = data;
      set((state) => ({
        transfers: state.transfers.map((t) => {
          if (t.explorerId === explorerID && t.status === 'in_progress' && t.isUpload === isUpload) {
            return {
              ...t,
              bytesTransferred,
              totalBytes,
              status: bytesTransferred >= totalBytes ? 'completed' : 'in_progress',
            };
          }
          return t;
        }),
      }));
    });
  }

  return {
    explorers: {},
    transfers: [],

    openExplorer: async (sessionTabId, sessionId) => {
      try {
        const explorerId = await OpenSftpExplorer(sessionId);
        const explorer: SftpExplorer = {
          explorerId,
          sessionTabId,
          currentPath: '/',
          entries: [],
          loading: false,
          error: null,
          history: ['/'],
        };
        set((state) => ({ explorers: { ...state.explorers, [explorerId]: explorer } }));
        await get().navigateTo(explorerId, '/');
        return explorerId;
      } catch (e: any) {
        console.error('Failed to open SFTP explorer:', e);
        return null;
      }
    },

    closeExplorer: (explorerId) => {
      CloseSftpExplorer(explorerId).catch(() => {});
      set((state) => {
        const explorers = { ...state.explorers };
        delete explorers[explorerId];
        return { explorers, transfers: state.transfers.filter((t) => t.explorerId !== explorerId) };
      });
    },

    navigateTo: async (explorerId, path) => {
      const explorer = get().explorers[explorerId];
      if (!explorer) return;

      set((state) => ({
        explorers: {
          ...state.explorers,
          [explorerId]: { ...explorer, loading: true, error: null },
        },
      }));

      try {
        const entries = await SftpListDir(explorerId, path);
        set((state) => ({
          explorers: {
            ...state.explorers,
            [explorerId]: {
              ...state.explorers[explorerId],
              currentPath: path,
              entries: entries || [],
              loading: false,
              history: [...state.explorers[explorerId].history, path],
            },
          },
        }));
      } catch (e: any) {
        set((state) => ({
          explorers: {
            ...state.explorers,
            [explorerId]: { ...state.explorers[explorerId], loading: false, error: e.toString() },
          },
        }));
      }
    },

    goUp: async (explorerId) => {
      const explorer = get().explorers[explorerId];
      if (!explorer || explorer.currentPath === '/') return;
      const parent = explorer.currentPath.split('/').slice(0, -1).join('/') || '/';
      await get().navigateTo(explorerId, parent);
    },

    goBack: async (explorerId) => {
      const explorer = get().explorers[explorerId];
      if (!explorer || explorer.history.length <= 1) return;
      const newHistory = explorer.history.slice(0, -1);
      const prevPath = newHistory[newHistory.length - 1];
      set((state) => ({
        explorers: {
          ...state.explorers,
          [explorerId]: { ...state.explorers[explorerId], history: newHistory },
        },
      }));
      await get().navigateTo(explorerId, prevPath);
    },

    mkdir: async (explorerId, path) => {
      await SftpMkdir(explorerId, path);
      const explorer = get().explorers[explorerId];
      if (explorer) await get().navigateTo(explorerId, explorer.currentPath);
    },

    remove: async (explorerId, path) => {
      await SftpRemove(explorerId, path);
      const explorer = get().explorers[explorerId];
      if (explorer) await get().navigateTo(explorerId, explorer.currentPath);
    },

    rename: async (explorerId, oldPath, newPath) => {
      await SftpRename(explorerId, oldPath, newPath);
      const explorer = get().explorers[explorerId];
      if (explorer) await get().navigateTo(explorerId, explorer.currentPath);
    },

    upload: async (explorerId, localPath, remotePath) => {
      const transferId = crypto.randomUUID();
      const transfer: Transfer = {
        id: transferId,
        explorerId,
        localPath,
        remotePath,
        isUpload: true,
        bytesTransferred: 0,
        totalBytes: 0,
        status: 'in_progress',
      };
      set((state) => ({ transfers: [...state.transfers, transfer] }));

      try {
        await SftpUpload(explorerId, localPath, remotePath);
        set((state) => ({
          transfers: state.transfers.map((t) =>
            t.id === transferId ? { ...t, status: 'completed' as const, bytesTransferred: t.totalBytes } : t
          ),
        }));
        const explorer = get().explorers[explorerId];
        if (explorer) await get().navigateTo(explorerId, explorer.currentPath);
      } catch (e: any) {
        set((state) => ({
          transfers: state.transfers.map((t) =>
            t.id === transferId ? { ...t, status: 'failed' as const, error: e.toString() } : t
          ),
        }));
      }
    },

    download: async (explorerId, remotePath, localPath) => {
      const transferId = crypto.randomUUID();
      const transfer: Transfer = {
        id: transferId,
        explorerId,
        localPath,
        remotePath,
        isUpload: false,
        bytesTransferred: 0,
        totalBytes: 0,
        status: 'in_progress',
      };
      set((state) => ({ transfers: [...state.transfers, transfer] }));

      try {
        await SftpDownload(explorerId, remotePath, localPath);
        set((state) => ({
          transfers: state.transfers.map((t) =>
            t.id === transferId ? { ...t, status: 'completed' as const, bytesTransferred: t.totalBytes } : t
          ),
        }));
      } catch (e: any) {
        set((state) => ({
          transfers: state.transfers.map((t) =>
            t.id === transferId ? { ...t, status: 'failed' as const, error: e.toString() } : t
          ),
        }));
      }
    },

    getExplorer: (explorerId) => get().explorers[explorerId],
  };
});
