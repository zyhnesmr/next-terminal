import React, { useEffect, useState, useRef } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useTerminalStore } from '../../stores/terminalStore';
import { ConnectionForm } from '../connection/ConnectionForm';
import { ThemeSelector } from './ThemeSelector';
import { SessionHistory } from './SessionHistory';
import { domain } from '../../../wailsjs/go/models';
import { Folder, Search, Plus, Trash2, Terminal, Pencil, FolderOpen, ChevronDown, ChevronRight, Check, X, Clock } from 'lucide-react';

export function Sidebar() {
  const {
    connections, groups, searchQuery,
    loadConnections, loadGroups, setSearchQuery,
    removeConnection, addGroup, updateGroup, removeGroup,
  } = useConnectionStore();
  const { openTab } = useTerminalStore();
  const [viewMode, setViewMode] = useState<'connections' | 'history'>('connections');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editConn, setEditConn] = useState<domain.Connection | undefined>();
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const newGroupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConnections();
    loadGroups();
  }, []);

  useEffect(() => {
    if (showNewGroupInput && newGroupInputRef.current) {
      newGroupInputRef.current.focus();
    }
  }, [showNewGroupInput]);

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

  const handleToggleGroup = (group: domain.Group) => {
    updateGroup({ ...group, isExpanded: !group.isExpanded });
  };

  const handleRenameGroup = (group: domain.Group) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleSaveRename = (group: domain.Group) => {
    if (editingGroupName.trim() && editingGroupName.trim() !== group.name) {
      updateGroup({ ...group, name: editingGroupName.trim() });
    }
    setEditingGroupId(null);
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      addGroup({ name: newGroupName.trim(), parentId: '', sortOrder: groups.length, isExpanded: true });
      setNewGroupName('');
      setShowNewGroupInput(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    await removeGroup(groupId);
    loadConnections(); // refresh connections that were in this group
  };

  const inputStyle = {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-primary)' }}>
      {/* View toggle */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setViewMode('connections')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors"
          style={{
            backgroundColor: viewMode === 'connections' ? 'var(--tab-active)' : 'transparent',
            color: viewMode === 'connections' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: viewMode === 'connections' ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          <Terminal size={13} />
          Connections
        </button>
        <button
          onClick={() => setViewMode('history')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors"
          style={{
            backgroundColor: viewMode === 'history' ? 'var(--tab-active)' : 'transparent',
            color: viewMode === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: viewMode === 'history' ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          <Clock size={13} />
          History
        </button>
      </div>

      {viewMode === 'connections' ? (
        <>
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
                style={inputStyle}
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
              const isExpanded = group.isExpanded !== false;
              if (groupConns.length === 0 && searchQuery) return null;

              return (
                <div key={group.id}>
                  <GroupHeader
                    group={group}
                    connectionCount={groupConns.length}
                    isExpanded={isExpanded}
                    isEditing={editingGroupId === group.id}
                    editingName={editingGroupName}
                    onToggle={() => handleToggleGroup(group)}
                    onRename={() => handleRenameGroup(group)}
                    onSaveRename={() => handleSaveRename(group)}
                    onCancelRename={() => setEditingGroupId(null)}
                    onEditName={setEditingGroupName}
                    onDelete={() => handleDeleteGroup(group.id)}
                  />
                  {isExpanded && groupConns.map((conn) => (
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

            {/* New Group input / button */}
            {showNewGroupInput ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                <Folder size={12} className="opacity-50 shrink-0" />
                <input
                  ref={newGroupInputRef}
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateGroup();
                    if (e.key === 'Escape') { setShowNewGroupInput(false); setNewGroupName(''); }
                  }}
                  onBlur={() => { if (!newGroupName.trim()) setShowNewGroupInput(false); }}
                  className="flex-1 px-2 py-0.5 rounded text-xs outline-none"
                  style={inputStyle}
                  placeholder="Group name..."
                />
                <button onClick={handleCreateGroup} className="p-0.5 rounded" style={{ color: 'var(--success)' }}>
                  <Check size={12} />
                </button>
                <button onClick={() => { setShowNewGroupInput(false); setNewGroupName(''); }} className="p-0.5 rounded" style={{ color: 'var(--danger)' }}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewGroupInput(true)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs opacity-40 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-primary)' }}
              >
                <Plus size={12} />
                New Group
              </button>
            )}

            {connections.length === 0 && (
              <div className="px-4 py-8 text-center text-sm opacity-50">
                No connections yet.
                <br />
                Click + to add one.
              </div>
            )}
          </div>
        </>
      ) : (
        <SessionHistory />
      )}

      {/* Footer */}
      <div className="p-2 border-t flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
        <ThemeSelector />
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

function GroupHeader({
  group, connectionCount, isExpanded, isEditing, editingName,
  onToggle, onRename, onSaveRename, onCancelRename, onEditName, onDelete,
}: {
  group: domain.Group;
  connectionCount: number;
  isExpanded: boolean;
  isEditing: boolean;
  editingName: string;
  onToggle: () => void;
  onRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onEditName: (n: string) => void;
  onDelete: () => void;
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDeleteClick = () => {
    setContextMenu(null);
    if (confirm(`Delete group "${group.name}"? Connections in this group will become ungrouped.`)) {
      onDelete();
    }
  };

  return (
    <>
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider cursor-pointer group-header select-none"
        style={{ opacity: 0.7 }}
        onClick={onToggle}
        onContextMenu={handleContextMenu}
      >
        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={12} />
        {isEditing ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => onEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveRename();
              if (e.key === 'Escape') onCancelRename();
            }}
            onBlur={onSaveRename}
            className="flex-1 px-1 py-0 rounded text-xs outline-none"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="truncate hover:underline cursor-text"
            onClick={(e) => { e.stopPropagation(); onRename(); }}
          >
            {group.name}
          </span>
        )}
        <span className="ml-auto opacity-50">{connectionCount}</span>
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 py-1 rounded shadow-xl text-xs"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            minWidth: 140,
          }}
        >
          <div
            className="px-3 py-1.5 cursor-pointer hover:opacity-80"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => { setContextMenu(null); onRename(); }}
          >
            Rename
          </div>
          <div
            className="px-3 py-1.5 cursor-pointer hover:opacity-80"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={handleDeleteClick}
          >
            Delete Group
          </div>
        </div>
      )}
    </>
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
