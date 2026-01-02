import React, { useMemo, useState } from 'react';
import type { SessionMessage } from '../../services';

type Props = {
  messages: SessionMessage[];
  isTyping?: boolean;
  connected?: boolean;
  disabled?: boolean;
  onSend: (content: string) => void;
};

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function senderLabel(msg: SessionMessage): string {
  if (msg.role === 'user') return 'You';
  if (msg.role === 'agent') return 'DevBot';
  if (msg.role === 'system') return 'System';
  return msg.role;
}

const ChatInterface = ({ messages, isTyping, connected, disabled, onSend }: Props) => {
  const [draft, setDraft] = useState('');

  const ordered = useMemo(() => {
    return [...messages].sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
  }, [messages]);

  const submit = () => {
    const content = draft.trim();
    if (!content || disabled) return;
    onSend(content);
    setDraft('');
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative">
      <div className="h-14 border-b border-border-dark flex items-center justify-between px-6 bg-surface-dark/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 text-xs text-[#9dabb9]">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
          {isTyping ? <span className="ml-2 text-primary">typing…</span> : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
        {ordered.length === 0 ? (
          <div className="text-sm text-[#9dabb9]">No messages yet.</div>
        ) : (
          ordered.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-4 max-w-3xl ${isUser ? 'self-end flex-row-reverse' : ''}`}>
                <div
                  className={`size-8 rounded flex items-center justify-center shrink-0 mt-1 ${
                    isUser ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-primary/20'
                  }`}
                >
                  <span className={`material-symbols-outlined text-sm ${isUser ? 'text-purple-400' : 'text-primary'}`}>
                    {isUser ? 'person' : 'smart_toy'}
                  </span>
                </div>
                <div className={`flex flex-col gap-1 w-full min-w-0 ${isUser ? 'items-end' : ''}`}>
                  <div className={`flex items-baseline gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-bold text-white">{senderLabel(msg)}</span>
                    <span className="text-[10px] text-[#5a6b7c]">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="text-sm text-[#d1d5db] leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-border-dark bg-background-dark">
        <div className="relative flex items-end gap-2 bg-surface-dark border border-border-dark rounded-xl p-2 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-sm">
          <button
            className="p-2 text-[#9dabb9] hover:text-white rounded-lg hover:bg-[#283039] transition-colors shrink-0 disabled:opacity-50"
            type="button"
            disabled
            title="Attachments not implemented"
          >
            <span className="material-symbols-outlined text-xl">add_circle</span>
          </button>
          <textarea
            className="w-full bg-transparent border-none text-sm text-white placeholder-[#5a6b7c] focus:ring-0 resize-none py-2.5 max-h-32 min-h-[44px]"
            placeholder={disabled ? 'Select a task to start…' : 'Ask DevBot to run commands or explain code...'}
            rows={1}
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          ></textarea>
          <button
            className="p-2 bg-primary hover:bg-blue-600 text-white rounded-lg transition-colors shrink-0 mb-0.5 disabled:opacity-50"
            type="button"
            disabled={disabled || !draft.trim()}
            onClick={submit}
          >
            <span className="material-symbols-outlined text-lg">arrow_upward</span>
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 px-1">
          <p className="text-[10px] text-[#5a6b7c]">AI can make mistakes. Review generated code.</p>
        </div>
      </div>
    </main>
  );
};

export default ChatInterface;

