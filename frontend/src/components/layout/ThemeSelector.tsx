import { useState, useRef, useEffect } from 'react';
import { themes } from '../../themes';
import { useSettingsStore } from '../../stores/settingsStore';
import { Palette, Check } from 'lucide-react';

export function ThemeSelector() {
  const { settings, updateSetting } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentTheme = themes.find((t) => t.id === settings.theme) || themes[0];

  const handleSelect = (themeId: string) => {
    updateSetting('theme', JSON.stringify(themeId));
    setOpen(false);
  };

  const swatchStyle = (color: string) => ({
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: color,
    border: '1px solid var(--border)',
  });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 p-1.5 rounded hover:opacity-80 text-xs w-full"
        style={{ color: 'var(--text-secondary)' }}
        title="Change theme"
      >
        <Palette size={16} />
        <span className="truncate">{currentTheme.name}</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-1 w-52 rounded-lg shadow-xl overflow-hidden z-50"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <div className="px-3 py-2 text-xs font-semibold opacity-50" style={{ color: 'var(--text-primary)' }}>
            Themes
          </div>
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
              style={{
                color: 'var(--text-primary)',
                backgroundColor: theme.id === settings.theme ? 'var(--hover)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (theme.id !== settings.theme) e.currentTarget.style.backgroundColor = 'var(--hover)';
              }}
              onMouseLeave={(e) => {
                if (theme.id !== settings.theme) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div className="flex gap-0.5">
                <div style={swatchStyle(theme.css['--bg-primary'])} />
                <div style={swatchStyle(theme.css['--accent'])} />
                <div style={swatchStyle(theme.css['--text-primary'])} />
              </div>
              <span className="flex-1 text-left">{theme.name}</span>
              {theme.id === settings.theme && <Check size={12} style={{ color: 'var(--accent)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
