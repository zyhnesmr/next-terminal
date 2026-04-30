import React, { useEffect, useState } from 'react';
import { useCredentialStore } from '../../stores/credentialStore';
import { domain } from '../../../wailsjs/go/models';
import { X, Plus, Trash2, Key, Shield, Fingerprint } from 'lucide-react';

type Credential = domain.Credential;

export function KeyManager() {
  const { credentials, loadCredentials, addCredential, removeCredential } = useCredentialStore();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  return (
    <div className="p-4" style={{ color: 'var(--text-primary)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Credentials</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {credentials.length === 0 && (
        <p className="text-xs opacity-50">No credentials stored. Add one to reuse across connections.</p>
      )}

      <div className="space-y-2">
        {credentials.map((cred) => (
          <div
            key={cred.id}
            className="flex items-center gap-2 px-3 py-2 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            {cred.type === 'password' ? (
              <Shield size={14} style={{ color: 'var(--accent)' }} />
            ) : (
              <Key size={14} style={{ color: 'var(--accent)' }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{cred.name}</div>
              <div className="opacity-50 flex items-center gap-1">
                <span>{cred.type}</span>
                {cred.fingerprint && (
                  <>
                    <span>·</span>
                    <Fingerprint size={9} />
                    <span className="font-mono truncate">{cred.fingerprint}</span>
                  </>
                )}
              </div>
            </div>
            <button
              className="p-1 rounded opacity-50 hover:opacity-100"
              style={{ color: 'var(--danger)' }}
              onClick={() => removeCredential(cred.id)}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <CredentialForm
          onClose={() => setShowForm(false)}
          onSave={async (cred) => {
            await addCredential(cred);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

interface CredentialFormProps {
  onClose: () => void;
  onSave: (cred: Partial<Credential>) => Promise<void>;
}

function CredentialForm({ onClose, onSave }: CredentialFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('password');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [keyPassphrase, setKeyPassphrase] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const cred: Partial<Credential> = {
      name,
      type: type as any,
      password: type === 'password' ? password : undefined,
      privateKey: type.startsWith('key') ? privateKey : undefined,
      keyPassphrase: type === 'key+passphrase' ? keyPassphrase : undefined,
    };

    await onSave(cred);
    setSaving(false);
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
        className="w-full max-w-md rounded-lg shadow-xl p-6"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Credential</h2>
          <button onClick={onClose} className="p-1 rounded opacity-60 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-1.5 rounded text-sm outline-none" style={inputStyle} placeholder="My SSH Key" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 opacity-70">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-1.5 rounded text-sm outline-none" style={inputStyle}>
              <option value="password">Password</option>
              <option value="key">Private Key</option>
              <option value="key+passphrase">Private Key + Passphrase</option>
            </select>
          </div>

          {type === 'password' && (
            <div>
              <label className="block text-xs font-medium mb-1 opacity-70">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-3 py-1.5 rounded text-sm outline-none" style={inputStyle} placeholder="••••••••" />
            </div>
          )}

          {type.startsWith('key') && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1 opacity-70">Private Key</label>
                <textarea value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} required rows={6}
                  className="w-full px-3 py-1.5 rounded text-sm outline-none font-mono" style={inputStyle}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----" />
              </div>
              {type === 'key+passphrase' && (
                <div>
                  <label className="block text-xs font-medium mb-1 opacity-70">Key Passphrase</label>
                  <input type="password" value={keyPassphrase} onChange={(e) => setKeyPassphrase(e.target.value)}
                    className="w-full px-3 py-1.5 rounded text-sm outline-none" style={inputStyle} placeholder="••••••••" />
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 rounded text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 rounded text-sm font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
