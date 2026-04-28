import React from 'react';
import { Terminal } from 'lucide-react';

export function TitleBar() {
  return (
    <div
      className="flex items-center h-8 px-4 border-b select-none"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
    >
      <Terminal size={14} style={{ color: 'var(--accent)' }} />
      <span className="ml-2 text-xs font-semibold tracking-wide">next-terminal</span>
    </div>
  );
}
