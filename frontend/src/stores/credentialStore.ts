import { create } from 'zustand';
import {
  ListCredentials,
  SaveCredential,
  DeleteCredential,
} from '../../wailsjs/go/app/App';
import { domain } from '../../wailsjs/go/models';

type Credential = domain.Credential;

interface CredentialState {
  credentials: Credential[];
  loading: boolean;
  error: string | null;

  loadCredentials: () => Promise<void>;
  addCredential: (cred: Partial<Credential>) => Promise<void>;
  updateCredential: (cred: Credential) => Promise<void>;
  removeCredential: (id: string) => Promise<void>;
}

export const useCredentialStore = create<CredentialState>((set, get) => ({
  credentials: [],
  loading: false,
  error: null,

  loadCredentials: async () => {
    set({ loading: true, error: null });
    try {
      const creds = await ListCredentials();
      set({ credentials: creds || [], loading: false });
    } catch (e: any) {
      set({ error: e.toString(), loading: false });
    }
  },

  addCredential: async (cred) => {
    try {
      await SaveCredential(cred as Credential);
      await get().loadCredentials();
    } catch (e: any) {
      set({ error: e.toString() });
    }
  },

  updateCredential: async (cred) => {
    try {
      await SaveCredential(cred);
      await get().loadCredentials();
    } catch (e: any) {
      set({ error: e.toString() });
    }
  },

  removeCredential: async (id) => {
    try {
      await DeleteCredential(id);
      await get().loadCredentials();
    } catch (e: any) {
      set({ error: e.toString() });
    }
  },
}));
