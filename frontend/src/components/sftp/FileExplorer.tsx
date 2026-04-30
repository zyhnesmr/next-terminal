import React, { useState } from 'react';
import { useSftpStore } from '../../stores/sftpStore';
import { domain } from '../../../wailsjs/go/models';
import {
  Folder,
  File,
  FolderOpen,
  ArrowUp,
  ArrowLeft,
  RefreshCw,
  FolderPlus,
  Trash2,
  Pencil,
  Download,
  Upload,
  Loader2,
  Home,
} from 'lucide-react';

type FileEntry = domain.FileEntry;

interface FileExplorerProps {
  explorerId: string;
}

export function FileExplorer({ explorerId }: FileExplorerProps) {
  const { explorers, navigateTo, goUp, goBack, mkdir, remove, rename } = useSftpStore();
  const explorer = explorers[explorerId];
  const [newDirName, setNewDirName] = useState('');
  const [showNewDir, setShowNewDir] = useState(false);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modTime'>('name');

  if (!explorer) return null;

  const { currentPath, entries, loading, error } = explorer;

  const sorted = [...(entries || [])].sort((a, b) => {
    // Directories first
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'size') return a.size - b.size;
    return a.modTime - b.modTime;
  });

  const handleNavigate = (entry: FileEntry) => {
    if (entry.isDir) {
      navigateTo(explorerId, entry.path);
    }
  };

  const handleMkdir = async () => {
    if (!newDirName.trim()) return;
    const path = currentPath === '/' ? `/${newDirName}` : `${currentPath}/${newDirName}`;
    await mkdir(explorerId, path);
    setNewDirName('');
    setShowNewDir(false);
  };

  const handleRename = async (oldPath: string) => {
    if (!renameValue.trim()) {
      setRenamingPath(null);
      return;
    }
    const dir = oldPath.substring(0, oldPath.lastIndexOf('/')) || '/';
    const newPath = dir === '/' ? `/${renameValue}` : `${dir}/${renameValue}`;
    await rename(explorerId, oldPath, newPath);
    setRenamingPath(null);
    setRenameValue('');
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatTime = (ts: number) => {
    if (!ts) return '-';
    return new Date(ts * 1000).toLocaleDateString() + ' ' + new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div className="flex flex-col h-full" style={{ color: 'var(--text-primary)' }}>
      {/* Path bar */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 text-xs border-b"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <button onClick={() => navigateTo(explorerId, '/')} className="p-1 rounded hover:opacity-70" title="Root">
          <Home size={13} />
        </button>
        <button onClick={() => goBack(explorerId)} className="p-1 rounded hover:opacity-70" title="Back">
          <ArrowLeft size={13} />
        </button>
        <button onClick={() => goUp(explorerId)} className="p-1 rounded hover:opacity-70" title="Up">
          <ArrowUp size={13} />
        </button>
        <button onClick={() => navigateTo(explorerId, currentPath)} className="p-1 rounded hover:opacity-70" title="Refresh">
          <RefreshCw size={13} />
        </button>

        <div className="flex-1 flex items-center gap-0.5 mx-2 px-2 py-0.5 rounded overflow-x-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <span className="opacity-50 cursor-pointer" onClick={() => navigateTo(explorerId, '/')}>/</span>
          {pathParts.map((part, i) => {
            const partPath = '/' + pathParts.slice(0, i + 1).join('/');
            return (
              <React.Fragment key={partPath}>
                <span className="cursor-pointer hover:underline" onClick={() => navigateTo(explorerId, partPath)}>{part}</span>
                {i < pathParts.length - 1 && <span className="opacity-50">/</span>}
              </React.Fragment>
            );
          })}
        </div>

        <button onClick={() => setShowNewDir(true)} className="p-1 rounded hover:opacity-70" title="New Folder">
          <FolderPlus size={13} />
        </button>
      </div>

      {/* New directory input */}
      {showNewDir && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <FolderPlus size={12} className="opacity-50" />
          <input
            type="text"
            value={newDirName}
            onChange={(e) => setNewDirName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleMkdir(); if (e.key === 'Escape') setShowNewDir(false); }}
            placeholder="New folder name..."
            className="flex-1 px-2 py-0.5 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            autoFocus
          />
          <button onClick={handleMkdir} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Create</button>
          <button onClick={() => { setShowNewDir(false); setNewDirName(''); }} className="px-2 py-0.5 rounded text-xs opacity-60 hover:opacity-100">Cancel</button>
        </div>
      )}

      {/* Sort bar */}
      <div className="flex items-center gap-2 px-3 py-1 text-xs border-b opacity-60" style={{ borderColor: 'var(--border)' }}>
        <span className="w-6"></span>
        <button onClick={() => setSortBy('name')} className={`flex-1 text-left ${sortBy === 'name' ? 'font-semibold' : ''}`}>Name</button>
        <button onClick={() => setSortBy('size')} className={`w-20 text-right ${sortBy === 'size' ? 'font-semibold' : ''}`}>Size</button>
        <button onClick={() => setSortBy('modTime')} className={`w-32 text-right ${sortBy === 'modTime' ? 'font-semibold' : ''}`}>Modified</button>
        <span className="w-16"></span>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin opacity-50" />
          </div>
        )}
        {error && (
          <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--danger)' }}>{error}</div>
        )}
        {!loading && !error && sorted.length === 0 && (
          <div className="px-4 py-8 text-center text-xs opacity-50">Empty directory</div>
        )}
        {sorted.map((entry) => (
          <div
            key={entry.path}
            className="flex items-center gap-2 px-3 py-1 text-xs cursor-pointer group"
            style={{ borderBottom: '1px solid transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onDoubleClick={() => handleNavigate(entry)}
          >
            {entry.isDir ? (
              <Folder size={14} style={{ color: 'var(--accent)' }} />
            ) : (
              <File size={14} className="opacity-50" />
            )}
            {renamingPath === entry.path ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(entry.path); if (e.key === 'Escape') setRenamingPath(null); }}
                onBlur={() => handleRename(entry.path)}
                className="flex-1 px-1 py-0 rounded text-xs outline-none"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--accent)' }}
                autoFocus
              />
            ) : (
              <span className="flex-1 truncate">{entry.name}</span>
            )}
            <span className="w-20 text-right opacity-50">{entry.isDir ? '-' : formatSize(entry.size)}</span>
            <span className="w-32 text-right opacity-50">{formatTime(entry.modTime)}</span>
            <div className="w-16 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {!entry.isDir && (
                <button
                  className="p-0.5 rounded hover:opacity-70"
                  onClick={(e) => { e.stopPropagation(); }}
                  title="Download"
                >
                  <Download size={11} />
                </button>
              )}
              <button
                className="p-0.5 rounded hover:opacity-70"
                onClick={(e) => { e.stopPropagation(); setRenamingPath(entry.path); setRenameValue(entry.name); }}
                title="Rename"
              >
                <Pencil size={11} />
              </button>
              <button
                className="p-0.5 rounded hover:opacity-70"
                onClick={(e) => { e.stopPropagation(); remove(explorerId, entry.path); }}
                title="Delete"
                style={{ color: 'var(--danger)' }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
