import React, { useState } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { domain } from '../../../wailsjs/go/models';
import { X } from 'lucide-react';

interface ConnectionFormProps {
  connection?: domain.Connection;
  onClose: () => void;
}

export function ConnectionForm({ connection, onClose }: ConnectionFormProps) {
  const { addConnection, updateConnection } = useConnectionStore();
  const isEdit = !!connection?.id;

  const [name, setName] = useState(connection?.name || '');
  const [host, setHost] = useState(connection?.host || '');
  const [port, setPort] = useState(connection?.port || 22);
  const [username, setUsername] = useState(connection?.username || '');
  const [authMethod, setAuthMethod] = useState(connection?.authMethod || 'password');
  const [password, setPassword] = useState('');
  const [groupId, setGroupId] = useState(connection?.groupId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const conn: Partial<domain.Connection> = {
      name,
      host,
      port,
      username,
      authMethod,
      groupId: groupId || undefined,
    };

    // Only include password for password auth and if provided
    if (authMethod === 'password' || authMethod === 'password+mfa') {
      if (!isEdit || password) {
        (conn as any).password = password;
      }
    }

    if (isEdit && connection) {
      conn.id = connection.id;
      await updateConnection(conn as domain.Connection);
    } else {
      await addConnection(conn as domain.Connection);
    }

    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg shadow-xl p-6"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Connection' : 'New Connection'}</h2>
          <button onClick={onClose} className="p-1 rounded opacity-60 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-1.5 rounded text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              placeholder="My Server"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1 opacity-70">Host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                placeholder="192.168.1.1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value) || 22)}
                className="w-full px-3 py-1.5 rounded text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-1.5 rounded text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              placeholder="root"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Authentication</label>
            <select
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value)}
              className="w-full px-3 py-1.5 rounded text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              <option value="password">Password</option>
              <option value="key">Private Key</option>
            </select>
          </div>

          {(authMethod === 'password' || authMethod === 'password+mfa') && (
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">
                Password {isEdit && '(leave empty to keep current)'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEdit}
                className="w-full px-3 py-1.5 rounded text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <div className="text-xs" style={{ color: 'var(--danger)' }}>{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded text-sm font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
