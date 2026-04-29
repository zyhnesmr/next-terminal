import React, { useState } from 'react';
import { EventsEmit } from '../../../wailsjs/runtime/runtime';
import { Shield, X } from 'lucide-react';

interface MfaChallengePrompt {
  name: string;
  instruction: string;
  prompt: string;
  echo: boolean;
}

interface MfaPromptProps {
  sessionId: string;
  user: string;
  instruction: string;
  prompts: MfaChallengePrompt[];
  onClose: () => void;
}

export function MfaPrompt({ sessionId, user, instruction, prompts, onClose }: MfaPromptProps) {
  const [responses, setResponses] = useState<string[]>(prompts.map(() => ''));
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    EventsEmit('auth:mfa-response', sessionId, responses);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="w-full max-w-sm rounded-lg shadow-xl p-6"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={18} style={{ color: 'var(--accent)' }} />
            <h2 className="text-base font-semibold">MFA Authentication</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded opacity-60 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        {instruction && (
          <p className="text-xs mb-3 opacity-70">{instruction}</p>
        )}

        {user && (
          <p className="text-xs mb-3 opacity-50">User: {user}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {prompts.map((prompt, i) => (
            <div key={i}>
              <label className="block text-xs font-medium mb-1 opacity-70">{prompt.prompt}</label>
              <input
                type={prompt.echo ? 'text' : 'password'}
                value={responses[i]}
                onChange={(e) => {
                  const next = [...responses];
                  next[i] = e.target.value;
                  setResponses(next);
                }}
                autoFocus={i === 0}
                required
                className="w-full px-3 py-1.5 rounded text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
                placeholder={prompt.prompt}
              />
            </div>
          ))}

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
              disabled={submitted}
              className="px-4 py-1.5 rounded text-sm font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {submitted ? 'Submitted' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
