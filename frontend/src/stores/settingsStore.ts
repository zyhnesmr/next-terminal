import { create } from 'zustand';
import { GetSettings, SaveSetting } from '../../wailsjs/go/app/App';
import { domain } from '../../wailsjs/go/models';

type AppSettings = domain.AppSettings;

interface SettingsState {
  settings: AppSettings;
  loading: boolean;

  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: new domain.AppSettings({
    theme: 'dracula',
    fontFamily: 'Menlo',
    fontSize: 14,
    defaultShell: '',
    scrollback: 10000,
    cursorStyle: 'block',
    cursorBlink: true,
    copyOnSelect: false,
    confirmOnClose: true,
  }),
  loading: false,

  loadSettings: async () => {
    set({ loading: true });
    try {
      const settings = await GetSettings();
      set({ settings: domain.AppSettings.createFrom(settings), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateSetting: async (key, value) => {
    try {
      await SaveSetting(key, value);
      const settings = domain.AppSettings.createFrom(get().settings);
      (settings as any)[key] = JSON.parse(value);
      set({ settings });
    } catch {
      // silently fail
    }
  },
}));
