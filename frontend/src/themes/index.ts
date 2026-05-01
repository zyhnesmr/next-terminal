import { dracula } from './dracula';
import { monokai } from './monokai';
import { solarizedDark } from './solarized-dark';
import { solarizedLight } from './solarized-light';
import { nord } from './nord';
import { catppuccinMocha } from './catppuccin-mocha';
import { githubDark } from './github-dark';

export const themes = [
  dracula,
  monokai,
  solarizedDark,
  solarizedLight,
  nord,
  catppuccinMocha,
  githubDark,
];

export { dracula, monokai, solarizedDark, solarizedLight, nord, catppuccinMocha, githubDark };

export function getTheme(themeId: string) {
  return themes.find((t) => t.id === themeId) || dracula;
}

export function getXtermTheme(themeId: string) {
  return getTheme(themeId).xterm;
}

export function applyTheme(themeId: string) {
  const theme = getTheme(themeId);
  const root = document.documentElement.style;
  for (const [key, value] of Object.entries(theme.css)) {
    root.setProperty(key, value);
  }
}
