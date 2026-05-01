import { useEffect, useState } from 'react';
import { GetSessionHistory } from '../../../wailsjs/go/app/App';
import { domain } from '../../../wailsjs/go/models';
import { Clock, Terminal as TerminalIcon } from 'lucide-react';
import { useTerminalStore } from '../../stores/terminalStore';
import { useConnectionStore } from '../../stores/connectionStore';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Yesterday ${time}`;
  return `${d.toLocaleDateString()} ${time}`;
}

export function SessionHistory() {
  const [sessions, setSessions] = useState<domain.SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { openTab } = useTerminalStore();
  const { connections } = useConnectionStore();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await GetSessionHistory(50);
      setSessions(result || []);
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const handleReconnect = (session: domain.SessionHistory) => {
    const conn = connections.find((c) => c.id === session.connectionId);
    if (conn) {
      openTab(conn.id, conn.name, conn.host);
    }
  };

  const duration = (s: domain.SessionHistory) => {
    const end = s.endedAt || Math.floor(Date.now() / 1000);
    return Math.max(0, end - s.startedAt);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
        <Clock size={16} className="animate-spin opacity-50" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8 text-center text-sm opacity-50">
        No session history yet.<br />Open a terminal to get started.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center gap-2 px-4 py-1.5 cursor-pointer text-sm transition-colors"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={() => handleReconnect(session)}
        >
          <TerminalIcon size={13} className="shrink-0 opacity-50" />
          <div className="flex-1 min-w-0">
            <div className="truncate font-medium text-xs">
              {session.connectionName || session.connectionId}
            </div>
            <div className="text-xs opacity-50 truncate flex items-center gap-1.5">
              <span>{session.host || 'unknown'}</span>
              <span>·</span>
              <span>{formatDuration(duration(session))}</span>
              <span>·</span>
              <span>{formatTime(session.startedAt)}</span>
            </div>
          </div>
          {session.exitStatus !== 0 && (session.endedAt ?? 0) > 0 && (
            <span className="text-xs px-1 rounded" style={{ backgroundColor: 'var(--danger)', color: 'white' }}>
              {session.exitStatus}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
