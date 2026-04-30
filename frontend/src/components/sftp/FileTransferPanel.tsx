import React from 'react';
import { useSftpStore } from '../../stores/sftpStore';
import { Upload, Download, CheckCircle2, XCircle, Loader2, ArrowUp, ArrowDown } from 'lucide-react';

export function FileTransferPanel() {
  const { transfers } = useSftpStore();

  if (transfers.length === 0) return null;

  const activeTransfers = transfers.filter((t) => t.status === 'in_progress' || t.status === 'pending');
  const recentTransfers = transfers.filter((t) => t.status === 'completed' || t.status === 'failed').slice(-5);

  return (
    <div
      className="border-t"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border-b" style={{ borderColor: 'var(--border)' }}>
        <span>Transfers</span>
        {activeTransfers.length > 0 && (
          <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            {activeTransfers.length}
          </span>
        )}
      </div>

      <div className="max-h-32 overflow-y-auto">
        {activeTransfers.map((t) => {
          const progress = t.totalBytes > 0 ? (t.bytesTransferred / t.totalBytes) * 100 : 0;
          const fileName = t.isUpload ? t.remotePath.split('/').pop() : t.localPath.split('/').pop();
          return (
            <div key={t.id} className="flex items-center gap-2 px-3 py-1 text-xs">
              {t.isUpload ? <ArrowUp size={11} style={{ color: 'var(--accent)' }} /> : <ArrowDown size={11} style={{ color: '#4CAF50' }} />}
              <span className="flex-1 truncate opacity-70">{fileName}</span>
              <div className="w-24 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }}
                />
              </div>
              <span className="w-10 text-right opacity-50">{Math.round(progress)}%</span>
              <Loader2 size={10} className="animate-spin opacity-50" />
            </div>
          );
        })}

        {recentTransfers.map((t) => {
          const fileName = t.isUpload ? t.remotePath.split('/').pop() : t.localPath.split('/').pop();
          return (
            <div key={t.id} className="flex items-center gap-2 px-3 py-1 text-xs opacity-60">
              {t.status === 'completed' ? (
                <CheckCircle2 size={11} style={{ color: '#4CAF50' }} />
              ) : (
                <XCircle size={11} style={{ color: 'var(--danger)' }} />
              )}
              <span className="flex-1 truncate">{fileName}</span>
              <span className="text-xs opacity-50">{t.status === 'completed' ? 'Done' : 'Failed'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
