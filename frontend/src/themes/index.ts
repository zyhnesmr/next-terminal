export { dracula } from './dracula';

import { dracula } from './dracula';

export const themes = [dracula];

export function applyTheme(themeId: string) {
  const theme = themes.find((t) => t.id === themeId) || dracula;
  const root = document.documentElement.style;
  for (const [key, value] of Object.entries(theme.css)) {
    root.setProperty(key, value);
  }
}
