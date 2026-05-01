import React, { useState, useEffect } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useCredentialStore } from '../../stores/credentialStore';
import { domain } from '../../../wailsjs/go/models';
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface ConnectionFormProps {
  connection?: domain.Connection;
  onClose: () => void;
}

export function ConnectionForm({ connection, onClose }: ConnectionFormProps) {
  const { connections, groups, addConnection, updateConnection } = useConnectionStore();
  const { credentials, loadCredentials } = useCredentialStore();
  const isEdit = !!connection?.id;

  useEffect(() => {
    loadCredentials();
  }, []);

  const [name, setName] = useState(connection?.name || '');
  const [host, setHost] = useState(connection?.host || '');
  const [port, setPort] = useState(connection?.port || 22);
  const [username, setUsername] = useState(connection?.username || '');
  const [authMethod, setAuthMethod] = useState(connection?.authMethod || 'password');
  const [password, setPassword] = useState('');
  const [groupId, setGroupId] = useState(connection?.groupId || '');
  const [credentialId, setCredentialId] = useState(connection?.credentialId || '');
  const [useCredential, setUseCredential] = useState(!!connection?.credentialId);
  const [jumpHostIds, setJumpHostIds] = useState<string[]>(() => {
    try {
      if (connection?.jumpHostIds) return JSON.parse(connection.jumpHostIds);
      return [];
    } catch { return []; }
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Other connections available as jump hosts (exclude self)
  const availableJumpHosts = connections.filter((c) => c.id !== connection?.id);

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
      credentialId: useCredential ? credentialId : undefined,
      jumpHostIds: jumpHostIds.length > 0 ? JSON.stringify(jumpHostIds) : '',
    };

    if (!useCredential && (authMethod === 'password' || authMethod === 'password+mfa')) {
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

  const addJumpHost = (id: string) => {
    if (!jumpHostIds.includes(id)) {
      setJumpHostIds([...jumpHostIds, id]);
    }
  };

  const removeJumpHost = (index: number) => {
    setJumpHostIds(jumpHostIds.filter((_, i) => i !== index));
  };

  const moveJumpHost = (index: number, direction: 'up' | 'down') => {
    const next = [...jumpHostIds];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setJumpHostIds(next);
  };

  const inputStyle = {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-lg shadow-xl p-6"
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
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-1.5 rounded text-sm outline-none" style={inputStyle} placeholder="My Server" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Group</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-1.5 rounded text-sm outline-none" style={inputStyle}>
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1 opacity-70">Host</label>
              <input type="text" value={host} onChange={(e) => setHost(e.target.value)} required
                className="w-full px-3 py-1.5 rounded text-sm outline-none" style={inputStyle} placeholder="192.168.1.1" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">Port</label>
              <input type="number" value={port} onChange={(e) => setPort(parseInt(e.target.value) || 22)}
                className="w-full px-3 py-1.5 rounded text-sm outline-none" style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
              className="w-full px-3 py-1.5 rounded text-sm outline-none" style={inputStyle} placeholder="root" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Authentication</label>
            <select value={authMethod} onChange={(e) => setAuthMethod(e.target.value)}
              className="w-full px-3 py-1.5 rounded text-sm outline-none" style={inputStyle}>
              <option value="password">Password</option>
              <option value="key">Private Key</option>
              <option value="password+mfa">Password + MFA</option>
              <option value="key+mfa">Private Key + MFA</option>
            </select>
          </div>

          {/* Credential selection */}
          <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <label className="flex items-center gap-2 text-xs font-medium mb-2 opacity-70">
              <input
                type="checkbox"
                checked={useCredential}
                onChange={(e) => setUseCredential(e.target.checked)}
                className="rounded"
              />
              Use saved credential
            </label>
            {useCredential && (
              <select
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                className="w-full px-3 py-1.5 rounded text-sm outline-none"
                style={inputStyle}
              >
                <option value="">Select credential...</option>
                {credentials.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {!useCredential && (authMethod === 'password' || authMethod === 'password+mfa') && (
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">
                Password {isEdit && '(leave empty to keep current)'}
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required={!isEdit} className="w-full px-3 py-1.5 rounded text-sm outline-none"
                style={inputStyle} placeholder="••••••••" />
            </div>
          )}

          {/* Jump Hosts Section */}
          <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-medium opacity-70 hover:opacity-100"
            >
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Jump Hosts / ProxyJump
              {jumpHostIds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                  {jumpHostIds.length}
                </span>
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-2">
                {/* Current jump chain */}
                {jumpHostIds.map((id, index) => {
                  const jumpConn = availableJumpHosts.find((c) => c.id === id);
                  return (
                    <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                      <span className="opacity-50 font-mono">{index + 1}.</span>
                      <span className="flex-1 truncate">{jumpConn?.name || id}</span>
                      <button type="button" onClick={() => moveJumpHost(index, 'up')}
                        disabled={index === 0} className="p-0.5 opacity-50 hover:opacity-100 disabled:opacity-20">
                        <ChevronUp size={12} />
                      </button>
                      <button type="button" onClick={() => moveJumpHost(index, 'down')}
                        disabled={index === jumpHostIds.length - 1} className="p-0.5 opacity-50 hover:opacity-100 disabled:opacity-20">
                        <ChevronDown size={12} />
                      </button>
                      <button type="button" onClick={() => removeJumpHost(index)}
                        className="p-0.5 opacity-50 hover:opacity-100" style={{ color: 'var(--danger)' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}

                {/* Add jump host */}
                {availableJumpHosts.filter((c) => !jumpHostIds.includes(c.id)).length > 0 && (
                  <div className="flex gap-2">
                    <select
                      id="jump-host-select"
                      defaultValue=""
                      className="flex-1 px-2 py-1 rounded text-xs outline-none"
                      style={inputStyle}
                      onChange={(e) => {
                        if (e.target.value) addJumpHost(e.target.value);
                        e.target.value = '';
                      }}
                    >
                      <option value="" disabled>Add jump host...</option>
                      {availableJumpHosts
                        .filter((c) => !jumpHostIds.includes(c.id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.username}@{c.host})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {jumpHostIds.length > 0 && (
                  <p className="text-xs opacity-40">
                    Connection order: You → {jumpHostIds.map((id) => availableJumpHosts.find((c) => c.id === id)?.name || id).join(' → ')} → Target
                  </p>
                )}
              </div>
            )}
          </div>

          {error && <div className="text-xs" style={{ color: 'var(--danger)' }}>{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 rounded text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 rounded text-sm font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
