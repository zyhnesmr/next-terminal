import { create } from 'zustand';
import {
  ListConnections,
  SaveConnection,
  DeleteConnection,
  ListGroups,
  SaveGroup,
  DeleteGroup,
} from '../../wailsjs/go/app/App';
import { domain } from '../../wailsjs/go/models';

type Connection = domain.Connection;
type Group = domain.Group;

interface ConnectionState {
  connections: Connection[];
  groups: Group[];
  loading: boolean;
  error: string | null;
  searchQuery: string;

  loadConnections: () => Promise<void>;
  loadGroups: () => Promise<void>;
  addConnection: (conn: Partial<Connection>) => Promise<void>;
  updateConnection: (conn: Connection) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  addGroup: (group: Partial<Group>) => Promise<void>;
  updateGroup: (group: Group) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  groups: [],
  loading: false,
  error: null,
  searchQuery: '',

  loadConnections: async () => {
    set({ loading: true, error: null });
    try {
      const conns = await ListConnections();
      set({ connections: conns || [], loading: false });
    } catch (e: any) {
      set({ error: e.toString(), loading: false });
    }
  },

  loadGroups: async () => {
    try {
      const groups = await ListGroups();
      set({ groups: groups || [] });
    } catch (e: any) {
      set({ error: e.toString() });
    }
  },

  addConnection: async (conn) => {
    try {
      await SaveConnection(conn as Connection);
      await get().loadConnections();
    } catch (e: any) {
      set({ error: e.toString() });
    }
  },

  updateConnection: async (conn) => {
    try {
      await SaveConnection(conn);
      await get().loadConnections();
    } catch (e: any) {
      set({ error: e.toString() });
    }
  },

  removeConnection: async (id) => {
    try {
      await DeleteConnection(id);
      await get().loadConnections();
    } catch (e: any) {
      set({ error: e.toString() });
    }
  },

  addGroup: async (group) => {
    try {
      await SaveGroup(group as Group);
      await get().loadGroups();
    } catch (e: any) {
      set({ error: e.toString() });
    }
  },

  updateGroup: async (group) => {
    try {
      await SaveGroup(group);
      await get().loadGroups();
    } catch (e: any) {
      set({ error: e.toString() });
    }
  },

  removeGroup: async (id) => {
    try {
      await DeleteGroup(id);
      await get().loadGroups();
    } catch (e: any) {
      set({ error: e.toString() });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
}));
