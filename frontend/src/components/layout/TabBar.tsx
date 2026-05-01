import React, { useState, useRef, useEffect } from 'react';
import { useTerminalStore } from '../../stores/terminalStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { X, Terminal, FolderOpen, Loader2 } from 'lucide-react';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTerminalStore();
  const { settings } = useSettingsStore();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
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

  if (tabs.length === 0) return null;

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex !== null && dragIndex !== index) {
      const reordered = [...tabs];
      const [removed] = reordered.splice(dragIndex, 1);
      reordered.splice(index, 0, removed);
      useTerminalStore.setState({ tabs: reordered });
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const handleCloseTab = (tabId: string) => {
    if (settings.confirmOnClose) {
      setConfirmClose(tabId);
    } else {
      closeTab(tabId);
    }
  };

  const handleCloseOthers = (tabId: string) => {
    tabs.forEach((t) => {
      if (t.id !== tabId) closeTab(t.id);
    });
    setContextMenu(null);
  };

  const handleCloseAll = () => {
    tabs.forEach((t) => closeTab(t.id));
    setContextMenu(null);
  };

  return (
    <>
      <div
        className="flex items-center h-9 overflow-x-auto"
        style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
      >
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            className="flex items-center gap-1.5 px-3 h-full text-xs cursor-pointer border-r whitespace-nowrap select-none"
            style={{
              backgroundColor: tab.id === activeTabId ? 'var(--tab-active)' : 'var(--tab-inactive)',
              borderColor: 'var(--border)',
              color: tab.id === activeTabId ? 'var(--text-primary)' : 'var(--text-secondary)',
              opacity: dragIndex === index ? 0.5 : 1,
              borderLeft: dragOverIndex === index ? '2px solid var(--accent)' : undefined,
            }}
            onClick={() => setActiveTab(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
          >
            {tab.connecting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : tab.type === 'sftp' ? (
              <FolderOpen size={12} style={{ color: 'var(--accent)' }} />
            ) : (
              <Terminal size={12} />
            )}
            <span className="font-medium">{tab.connectionName}</span>
            {tab.type === 'sftp' && <span className="opacity-50 text-xs">SFTP</span>}
            <button
              className="ml-1 p-0.5 rounded opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseTab(tab.id);
              }}
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Context menu */}
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
            className="px-3 py-1.5 cursor-pointer"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => { handleCloseTab(contextMenu.tabId); setContextMenu(null); }}
          >
            Close
          </div>
          <div
            className="px-3 py-1.5 cursor-pointer"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => handleCloseOthers(contextMenu.tabId)}
          >
            Close Others
          </div>
          <div
            className="px-3 py-1.5 cursor-pointer"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={handleCloseAll}
          >
            Close All
          </div>
        </div>
      )}

      {/* Close confirmation dialog */}
      {confirmClose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setConfirmClose(null)}
        >
          <div
            className="rounded-lg shadow-xl p-5 max-w-xs w-full mx-4"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm mb-4">Close this tab? Any running processes will be terminated.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClose(null)}
                className="px-3 py-1.5 rounded text-xs"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { closeTab(confirmClose); setConfirmClose(null); }}
                className="px-3 py-1.5 rounded text-xs font-medium"
                style={{ backgroundColor: 'var(--danger)', color: 'white' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
