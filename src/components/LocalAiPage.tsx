import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowUp, Sparkles, Copy, Check, Trash2 } from 'lucide-react';
import { useLocalAi } from '../hooks/useLocalAi';

interface Props {
  onClose: () => void;
}

interface Msg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = ['Write a friendly greeting', 'Reply: accept a meeting', 'Give me 3 icebreakers'];

export default function LocalAiPage({ onClose }: Props) {
  const { status, overallProgress, error, models, activeModelId, loadModel, generateChat } =
    useLocalAi();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Model downloads once on first visit, then loads from the browser cache.
  useEffect(() => {
    inputRef.current?.focus();
    if (status === 'unloaded') loadModel(activeModelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    const userMsg: Msg = { id: Date.now(), role: 'user', content: q };
    const botId = Date.now() + 1;
    const history = [...messages, userMsg].slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, userMsg, { id: botId, role: 'assistant', content: '' }]);
    setBusy(true);
    try {
      const full = await generateChat(history, 160, 0.6, (t) =>
        setMessages((m) => m.map((x) => (x.id === botId ? { ...x, content: x.content + t } : x)))
      );
      setMessages((m) =>
        m.map((x) => (x.id === botId ? { ...x, content: full || 'No response. Try again.' } : x))
      );
    } catch {
      setMessages((m) =>
        m.map((x) => (x.id === botId ? { ...x, content: 'Something went wrong. Try again.' } : x))
      );
    } finally {
      setBusy(false);
    }
  };

  const loading = status === 'loading';
  const dot =
    status === 'ready' || status === 'generating'
      ? 'bg-emerald-400'
      : loading
      ? 'bg-amber-400 animate-pulse'
      : error
      ? 'bg-rose-400'
      : 'bg-zinc-500';

  return (
    <div
      className="flex-1 flex flex-col h-full min-w-0 relative"
      style={{ color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 border-b"
        style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 transition"
            aria-label="Back to chats"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-color)' }} />
          <h1 className="text-sm font-semibold">AI</h1>
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          <span className="text-[11px] hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
            Runs on your CPU. Private.
          </span>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={activeModelId}
            onChange={(e) => loadModel(e.target.value)}
            disabled={busy || loading}
            title="Model"
            className="text-xs bg-transparent rounded-md px-2 py-1.5 outline-none cursor-pointer opacity-80 hover:opacity-100 disabled:opacity-40"
            style={{ color: 'var(--text-secondary)' }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                {m.name} ({m.size})
              </option>
            ))}
          </select>
          {messages.length > 0 && (
            <button
              onClick={() => !busy && setMessages([])}
              className="p-2 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition"
              aria-label="Clear chat"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="px-4 pt-3 w-full max-w-2xl mx-auto">
          <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Getting ready (first time only)</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(overallProgress, 3)}%`, background: 'var(--accent-color)' }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 pt-3 w-full max-w-2xl mx-auto text-xs text-rose-300 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button className="underline shrink-0" onClick={() => loadModel(activeModelId)}>
            Retry
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="w-full max-w-2xl mx-auto space-y-3 h-full">
          {messages.length === 0 ? (
            <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center gap-4">
              <Sparkles className="w-7 h-7 opacity-60" style={{ color: 'var(--accent-color)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Private AI on your device. No GPU needed.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={busy || loading}
                    className="text-xs px-3.5 py-2 rounded-full border hover:bg-white/5 transition disabled:opacity-40"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[88%]">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      m.role === 'user' ? 'text-white' : 'bg-white/5'
                    }`}
                    style={m.role === 'user' ? { background: 'var(--accent-color)' } : undefined}
                  >
                    {m.content || <span className="opacity-50">…</span>}
                  </div>
                  {m.role === 'assistant' && m.content && !busy && (
                    <button
                      className="flex items-center gap-1 mt-1 px-1 text-[11px] opacity-60 hover:opacity-100"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => {
                        navigator.clipboard.writeText(m.content);
                        setCopied(m.id);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                    >
                      {copied === m.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === m.id ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="p-3 border-t"
        style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="w-full max-w-2xl mx-auto flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={loading ? 'Loading model…' : 'Ask anything'}
            disabled={loading}
            className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-sm outline-none placeholder:opacity-50 focus:bg-white/10 transition disabled:opacity-50"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || busy || loading}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition active:scale-95 disabled:opacity-30"
            style={{ background: 'var(--accent-color)' }}
            aria-label="Send"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
