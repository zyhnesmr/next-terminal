import React, { useEffect, useState } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useTerminalStore } from '../../stores/terminalStore';
import { ConnectionForm } from '../connection/ConnectionForm';
import { domain } from '../../../wailsjs/go/models';
import { Folder, Search, Settings, Plus, Trash2, Terminal, Pencil, FolderOpen } from 'lucide-react';

export function Sidebar() {
  const { connections, groups, searchQuery, loadConnections, loadGroups, setSearchQuery, removeConnection } = useConnectionStore();
  const { openTab } = useTerminalStore();
  const [showNewForm, setShowNewForm] = useState(false);
  const [editConn, setEditConn] = useState<domain.Connection | undefined>();

  useEffect(() => {
    loadConnections();
    loadGroups();
  }, []);

  const filteredConnections = connections.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.host.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedConnections: Record<string, domain.Connection[]> = {};
  const ungrouped: domain.Connection[] = [];

  for (const conn of filteredConnections) {
    if (conn.groupId) {
      if (!groupedConnections[conn.groupId]) groupedConnections[conn.groupId] = [];
      groupedConnections[conn.groupId].push(conn);
    } else {
      ungrouped.push(conn);
    }
  }

  const handleConnect = (conn: domain.Connection) => {
    openTab(conn.id, conn.name, conn.host);
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-primary)' }}>
      {/* Search + Add */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 opacity-50" />
          <input
            type="text"
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
        </div>
        <button
          onClick={() => { setEditConn(undefined); setShowNewForm(true); }}
          className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          <Plus size={14} />
          New Connection
        </button>
      </div>

      {/* Connection List */}
      <div className="flex-1 overflow-y-auto py-1">
        {groups.map((group) => {
          const groupConns = groupedConnections[group.id] || [];
          if (groupConns.length === 0 && searchQuery) return null;
          return (
            <div key={group.id}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider opacity-60">
                <Folder size={12} />
                <span>{group.name}</span>
                <span className="ml-auto opacity-50">{groupConns.length}</span>
              </div>
              {groupConns.map((conn) => (
                <ConnectionItem
                  key={conn.id}
                  conn={conn}
                  onConnect={handleConnect}
                  onDelete={removeConnection}
                  onEdit={(c) => { setEditConn(c); setShowNewForm(true); }}
                />
              ))}
            </div>
          );
        })}

        {ungrouped.map((conn) => (
          <ConnectionItem
            key={conn.id}
            conn={conn}
            onConnect={handleConnect}
            onDelete={removeConnection}
            onEdit={(c) => { setEditConn(c); setShowNewForm(true); }}
          />
        ))}

        {connections.length === 0 && (
          <div className="px-4 py-8 text-center text-sm opacity-50">
            No connections yet.
            <br />
            Click + to add one.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
        <button
          className="p-1.5 rounded hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Connection Form Modal */}
      {showNewForm && (
        <ConnectionForm
          connection={editConn}
          onClose={() => { setShowNewForm(false); setEditConn(undefined); }}
        />
      )}
    </div>
  );
}

function ConnectionItem({ conn, onConnect, onDelete, onEdit }: {
  conn: domain.Connection;
  onConnect: (c: domain.Connection) => void;
  onDelete: (id: string) => void;
  onEdit: (c: domain.Connection) => void;
}) {
  const { openSftpTab } = useTerminalStore();

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 cursor-pointer group text-sm transition-colors"
      style={{ color: 'var(--text-primary)' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      onClick={() => onConnect(conn)}
    >
      <Terminal size={13} className="shrink-0" style={{ color: 'var(--accent)' }} />
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{conn.name}</div>
        <div className="text-xs opacity-50 truncate">
          {conn.username}@{conn.host}:{conn.port}
        </div>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
        style={{ color: 'var(--text-secondary)' }}
        onClick={(e) => { e.stopPropagation(); openSftpTab(conn.id, conn.name, conn.host); }}
        title="Open SFTP"
      >
        <FolderOpen size={12} />
      </button>
      <button
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
        style={{ color: 'var(--text-secondary)' }}
        onClick={(e) => { e.stopPropagation(); onEdit(conn); }}
        title="Edit"
      >
        <Pencil size={12} />
      </button>
      <button
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
        style={{ color: 'var(--danger)' }}
        onClick={(e) => { e.stopPropagation(); onDelete(conn.id); }}
        title="Delete"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
