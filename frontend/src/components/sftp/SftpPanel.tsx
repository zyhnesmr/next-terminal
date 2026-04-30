import React, { useState } from 'react';
import { useSftpStore } from '../../stores/sftpStore';
import { FileTree } from './FileTree';
import { FileExplorer } from './FileExplorer';
import { FileTransferPanel } from './FileTransferPanel';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';

interface SftpPanelProps {
  explorerId: string;
  onClose: () => void;
}

export function SftpPanel({ explorerId, onClose }: SftpPanelProps) {
  const { navigateTo, closeExplorer } = useSftpStore();
  const [showTree, setShowTree] = useState(true);

  const handleClose = () => {
    closeExplorer(explorerId);
    onClose();
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-xs border-b"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      >
        <span className="font-medium">SFTP</span>
        <div className="flex-1" />
        <button
          onClick={() => setShowTree(!showTree)}
          className="p-1 rounded opacity-60 hover:opacity-100"
          title={showTree ? 'Hide tree' : 'Show tree'}
        >
          {showTree ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
        </button>
        <button onClick={handleClose} className="p-1 rounded opacity-60 hover:opacity-100" title="Close SFTP">
          <X size={13} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {showTree && (
          <div
            className="w-48 border-r overflow-y-auto"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-sidebar)' }}
          >
            <FileTree explorerId={explorerId} onNavigate={(path) => navigateTo(explorerId, path)} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <FileExplorer explorerId={explorerId} />
        </div>
      </div>

      {/* Transfer panel */}
      <FileTransferPanel />
    </div>
  );
}
