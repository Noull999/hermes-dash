'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useHermesStore } from '@/store/useHermesStore';
import { runClaude } from '@/lib/api';
import { Sparkles, Send, Loader2, Terminal, MessageSquare, Code2, Shield, ShieldOff } from 'lucide-react';

interface ClaudeLauncherProps {
  open: boolean;
  onClose: () => void;
  defaultRepo?: string;
}

const models = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', desc: 'Balance velocidad/calidad' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', desc: 'Máxima capacidad' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', desc: 'Rápido y ligero' },
];

const modes = [
  { id: 'chat', label: 'Chat', Icon: MessageSquare },
  { id: 'code', label: 'Code', Icon: Code2 },
  { id: 'review', label: 'Review', Icon: Terminal },
];

export default function ClaudeLauncher({ open, onClose, defaultRepo }: ClaudeLauncherProps) {
  const repos = useHermesStore((s) => s.repos);
  const [selectedRepo, setSelectedRepo] = useState(defaultRepo || '');
  const [selectedModel, setSelectedModel] = useState(models[0].id);
  const [selectedMode, setSelectedMode] = useState('chat');
  const [allowEdits, setAllowEdits] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleExecute = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const result = await runClaude({
        repo: selectedRepo || undefined,
        model: selectedModel,
        prompt: prompt.trim(),
        mode: selectedMode as 'chat' | 'code' | 'review',
        allow_edits: allowEdits,
      });
      setResponse(result.response || result.error || 'Sin respuesta');
      if (!result.success && result.error) {
        setResponse(`Error: ${result.error}\n\n${result.response || ''}`);
      }
    } catch (err) {
      setResponse(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="🤖 Claude Launcher" maxWidth="520px">
      <div className="space-y-4">
        {/* Mode selector */}
        <div className="flex gap-2">
          {modes.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedMode(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedMode === id
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[rgba(255,45,85,0.2)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Repo selector */}
        {repos.length > 0 && (
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Repositorio (opcional)</label>
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/50"
            >
              <option value="">Sin repositorio</option>
              {repos.map((r) => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Model selector */}
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Modelo</label>
          <div className="grid gap-2">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  selectedModel === model.id
                    ? 'border-[var(--accent)]/50 bg-[rgba(255,45,85,0.06)]'
                    : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.12)]'
                }`}
              >
                <span className="text-sm font-medium text-[var(--text)]">{model.label}</span>
                <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">{model.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Toggle permisos */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
          <div className="flex items-center gap-2">
            {allowEdits ? (
              <ShieldOff size={16} className="text-[var(--amber)]" />
            ) : (
              <Shield size={16} className="text-[var(--text-muted)]" />
            )}
            <div>
              <span className="text-sm text-[var(--text)]">
                {allowEdits ? 'Permiso concedido' : 'Modo solo lectura'}
              </span>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {allowEdits
                  ? 'Claude puede editar archivos y hacer push'
                  : 'Solo responde, sin editar archivos'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setAllowEdits(!allowEdits)}
            className={`relative w-11 h-6 rounded-full transition-all ${
              allowEdits
                ? 'bg-[var(--accent)]'
                : 'bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                allowEdits ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Prompt */}
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="¿Qué necesitas que haga?"
            rows={4}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50 resize-none"
          />
        </div>

        {/* Execute button */}
        <button
          onClick={handleExecute}
          disabled={!prompt.trim() || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent)] text-[var(--bg)] font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--accent2)] transition-all active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Ejecutando...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Ejecutar
            </>
          )}
        </button>

        {/* Response */}
        {response && (
          <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-[var(--accent)]" />
              <span className="text-xs font-medium text-[var(--text)]">Respuesta</span>
            </div>
            <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{response}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
