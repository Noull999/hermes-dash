'use client';

import Card from '@/components/ui/Card';
import MiniOrb from './MiniOrb';
import { RepoData, pullRepo, cloneRepo, commitRepo } from '@/lib/api';
import { GitBranch, GitCommitHorizontal, FileWarning, ArrowUpFromLine, ArrowDownToLine, Sparkles, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import ClaudeLauncher from './ClaudeLauncher';

interface RepoCardProps {
  repo: RepoData;
  onClone?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  synced: 'SINCRONIZADO',
  behind: 'DETRÁS',
  ahead: 'ADELANTADO',
  unknown: 'SIN DATO',
};

export default function RepoCard({ repo, onClone }: RepoCardProps) {
  const [claudeOpen, setClaudeOpen] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullResult, setPullResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [pullMsg, setPullMsg] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [cloneMsg, setCloneMsg] = useState('');
  const [showCommit, setShowCommit] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [commitOutput, setCommitOutput] = useState('');

  const handlePull = async () => {
    setPulling(true);
    setPullResult('idle');
    setPullMsg('');
    try {
      const res = await pullRepo(repo.name);
      if (res.success) {
        setPullResult('success');
        setPullMsg(res.output || 'Already up to date');
      } else {
        setPullResult('error');
        setPullMsg(res.output || 'Error desconocido');
      }
    } catch (err) {
      setPullResult('error');
      setPullMsg((err as Error).message);
    } finally {
      setPulling(false);
      setTimeout(() => { setPullResult('idle'); setPullMsg(''); }, 4000);
    }
  };
  const handleClone = async () => {
    setCloning(true);
    setCloneResult('idle');
    setCloneMsg('');
    let cloned = false;
    try {
      const res = await cloneRepo(repo.name, repo.github_url);
      if (res.success) {
        setCloneResult('success');
        setCloneMsg(res.output || 'Repo clonado');
        cloned = true;
      } else {
        setCloneResult('error');
        setCloneMsg(res.output || 'Error al clonar');
      }
    } catch (err) {
      setCloneResult('error');
      setCloneMsg((err as Error).message);
    } finally {
      setCloning(false);
      if (cloned) {
        setTimeout(() => { onClone?.(); }, 1200);
      } else {
        setTimeout(() => { setCloneResult('idle'); setCloneMsg(''); }, 5000);
      }
    }
  };

  const handleCommit = async () => {
    if (!commitMsg.trim()) return;
    setCommitting(true);
    setCommitResult('idle');
    setCommitOutput('');
    try {
      const res = await commitRepo(repo.name, commitMsg.trim());
      if (res.success) {
        setCommitResult('success');
        setCommitOutput(res.output || 'Commiteado y pusheado ✅');
      } else {
        setCommitResult('error');
        setCommitOutput(res.output || 'Error al commitar');
      }
    } catch (err) {
      setCommitResult('error');
      setCommitOutput((err as Error).message);
    } finally {
      setCommitting(false);
      setShowCommit(false);
      setCommitMsg('');
      setTimeout(() => { setCommitResult('idle'); setCommitOutput(''); onClone?.(); }, 3000);
    }
  };

  const statusColor =
    repo.status === 'synced' ? 'var(--success)'
    : repo.status === 'behind' ? 'var(--amber)'
    : repo.status === 'ahead' ? 'var(--cyan)'
    : 'var(--text-muted)';

  return (
    <>
      <Card hover className="relative">
        {/* status mini orb */}
        <div className="absolute top-4 right-4">
          <MiniOrb status={repo.status} size={10} pulse={repo.dirty} />
        </div>

        {/* name + branch */}
        <div className="flex items-center gap-2 mb-2.5 pr-8">
          <GitBranch size={14} className="text-[var(--cyan)] flex-shrink-0" />
          <h3 className="text-sm font-semibold text-[var(--text)] truncate tracking-wide">{repo.name}</h3>
          <span className="hud-label text-[8px] px-1.5 py-0.5 border border-[var(--hairline)]">{repo.branch}</span>
        </div>

        {/* status row */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="hud-label text-[9px]" style={{ color: statusColor }}>
            {STATUS_LABEL[repo.status] || repo.status?.toUpperCase()}
          </span>
          {repo.behind > 0 && (
            <span className="flex items-center gap-1 hud-readout text-[10px] text-[var(--amber)]">
              <ArrowDownToLine size={11} />{repo.behind} behind
            </span>
          )}
          {repo.ahead > 0 && (
            <span className="flex items-center gap-1 hud-readout text-[10px] text-[var(--cyan)]">
              <ArrowUpFromLine size={11} />{repo.ahead} ahead
            </span>
          )}
          {repo.dirty && (
            <span className="flex items-center gap-1 hud-readout text-[10px] text-[var(--error)]">
              <FileWarning size={11} />dirty
            </span>
          )}
        </div>

        {/* last commit */}
        {repo.vps_commit && (
          <div className="flex items-start gap-2 mb-3 pb-3 border-b border-[var(--hairline)]">
            <GitCommitHorizontal size={12} className="text-[var(--text-faint)] mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="hud-readout text-[10px] text-[var(--cyan)]">{repo.vps_commit.slice(0, 7)}</span>
              <p className="text-[11px] text-[var(--text-muted)] truncate">{repo.vps_message?.split('\n')[0]}</p>
            </div>
          </div>
        )}

        {/* actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {repo.on_vps ? (
            <>
              {pullMsg && (
                <div className={`w-full text-[10px] px-2 py-1 rounded mb-1 ${
                  pullResult === 'success'
                    ? 'text-[var(--success)] bg-[rgba(93,255,176,0.06)]'
                    : 'text-[var(--error)] bg-[rgba(255,93,108,0.06)]'
                }`}>
                  {pullResult === 'success' ? <CheckCircle2 size={10} className="inline mr-1" /> : <XCircle size={10} className="inline mr-1" />}
                  {pullMsg.slice(0, 120)}
                </div>
              )}
              <button
                onClick={handlePull}
                disabled={pulling}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-[var(--hairline-strong)] bg-[rgba(79,227,255,0.08)] text-[var(--cyan)] hud-label text-[9px] hover:bg-[rgba(79,227,255,0.14)] transition-all disabled:opacity-50"
              >
                {pulling ? <Loader2 size={11} className="animate-spin" /> : <ArrowDownToLine size={11} />}
                {pulling ? 'PULLING...' : 'PULL VPS'}
              </button>
              <button
                onClick={() => setClaudeOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-[rgba(255,177,61,0.3)] bg-[rgba(255,177,61,0.08)] text-[var(--amber)] hud-label text-[9px] hover:bg-[rgba(255,177,61,0.14)] transition-all"
              >
                <Sparkles size={11} />CLAUDE
              </button>
              {repo.dirty && !showCommit && (
                <button
                  onClick={() => setShowCommit(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-[rgba(93,255,176,0.3)] bg-[rgba(93,255,176,0.08)] text-[var(--success)] hud-label text-[9px] hover:bg-[rgba(93,255,176,0.14)] transition-all"
                >
                  <GitCommitHorizontal size={11} />COMMIT
                </button>
              )}
              {showCommit && (
                <div className="w-full flex items-center gap-2 mt-1">
                  <input
                    autoFocus
                    type="text"
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                    placeholder="Mensaje del commit..."
                    className="flex-1 text-[10px] px-2 py-1.5 rounded-[2px] bg-[rgba(0,0,0,0.3)] border border-[var(--hairline-strong)] text-[var(--text)] outline-none focus:border-[var(--cyan)]"
                  />
                  <button
                    onClick={handleCommit}
                    disabled={committing || !commitMsg.trim()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-[2px] bg-[rgba(93,255,176,0.15)] text-[var(--success)] hud-label text-[9px] hover:bg-[rgba(93,255,176,0.25)] transition-all disabled:opacity-40"
                  >
                    {committing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    {committing ? 'ENVIANDO...' : '→'}
                  </button>
                </div>
              )}
              {commitOutput && (
                <div className={`w-full text-[10px] px-2 py-1 rounded ${
                  commitResult === 'success'
                    ? 'text-[var(--success)] bg-[rgba(93,255,176,0.06)]'
                    : 'text-[var(--error)] bg-[rgba(255,93,108,0.06)]'
                }`}>
                  {commitResult === 'success' ? <CheckCircle2 size={10} className="inline mr-1" /> : <XCircle size={10} className="inline mr-1" />}
                  {commitOutput.slice(0, 120)}
                </div>
              )}
            </>
          ) : (
            <>
              {cloneMsg && (
                <div className={`w-full text-[10px] px-2 py-1 rounded mb-1 ${
                  cloneResult === 'success'
                    ? 'text-[var(--success)] bg-[rgba(93,255,176,0.06)]'
                    : 'text-[var(--error)] bg-[rgba(255,93,108,0.06)]'
                }`}>
                  {cloneResult === 'success' ? <CheckCircle2 size={10} className="inline mr-1" /> : <XCircle size={10} className="inline mr-1" />}
                  {cloneMsg.slice(0, 120)}
                </div>
              )}
              <button
                onClick={handleClone}
                disabled={cloning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-[rgba(79,227,255,0.3)] bg-[rgba(79,227,255,0.08)] text-[var(--cyan)] hud-label text-[9px] hover:bg-[rgba(79,227,255,0.14)] transition-all disabled:opacity-50"
              >
                {cloning ? <Loader2 size={11} className="animate-spin" /> : <GitBranch size={11} />}
                {cloning ? 'CLONANDO...' : 'CLONAR EN VPS'}
              </button>
            </>
          )}
        </div>
      </Card>

      <ClaudeLauncher
        open={claudeOpen}
        onClose={() => setClaudeOpen(false)}
        defaultRepo={repo.name}
      />
    </>
  );
}
