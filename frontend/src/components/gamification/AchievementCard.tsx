'use client';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  Trophy,
  Lock,
  Star,
  MessageSquare,
  GitPullRequest,
  Zap,
  Brain,
  Clock,
  Award,
} from 'lucide-react';

interface AchievementInfo {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

interface AchievementCardProps {
  achievements?: {
    unlocked: AchievementInfo[];
    locked: AchievementInfo[];
  };
  level?: number;
  xp?: number;
  xp_next?: number;
  stats?: Record<string, number>;
}

const iconMap: Record<string, React.ReactNode> = {
  star: <Star size={16} />,
  message: <MessageSquare size={16} />,
  git: <GitPullRequest size={16} />,
  zap: <Zap size={16} />,
  brain: <Brain size={16} />,
  clock: <Clock size={16} />,
  award: <Award size={16} />,
  trophy: <Trophy size={16} />,
};

function resolveIcon(icon: string): React.ReactNode {
  return iconMap[icon] || <Award size={16} />;
}

const defaultAchievements = {
  unlocked: [
    {
      id: 'first-chat',
      name: 'Primer Chat',
      icon: 'message',
      desc: 'Iniciaste tu primera conversación con Hermes',
    },
    {
      id: 'early-adopter',
      name: 'Early Adopter',
      icon: 'star',
      desc: 'Usaste Hermes durante los primeros días',
    },
  ],
  locked: [
    {
      id: 'code-master',
      name: 'Code Master',
      icon: 'git',
      desc: 'Ejecuta 50 comandos de código',
    },
    {
      id: 'note-taker',
      name: 'Tomador de Notas',
      icon: 'brain',
      desc: 'Crea 10 notas en el cerebro',
    },
    {
      id: 'streak-7',
      name: 'Racha de 7 Días',
      icon: 'zap',
      desc: 'Usa Hermes por 7 días consecutivos',
    },
  ],
};

const defaultStats: Record<string, number> = {
  chats: 42,
  commands: 156,
  repos: 3,
  notes: 8,
  streak: 4,
};

export default function AchievementCard({
  achievements,
  level = 5,
  xp = 320,
  xp_next = 500,
  stats,
}: AchievementCardProps) {
  const data = achievements || defaultAchievements;
  const statData = stats || defaultStats;
  const xpPct = Math.min(Math.round((xp / xp_next) * 100), 100);

  return (
    <Card className="p-4 space-y-5">
      {/* Level + XP Section */}
      <div className="flex items-center gap-4">
        {/* Level circle */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400/30 to-purple-500/30 border-2 border-cyan-400/40 flex items-center justify-center pulse-glow">
            <div className="text-center">
              <span className="text-xs text-cyan-400/70 uppercase block leading-none -mt-1">
                Nivel
              </span>
              <span className="text-2xl font-extrabold text-white">
                {level}
              </span>
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/50">Experiencia</span>
            <span className="text-xs text-white/70 font-mono">
              {xp} / {xp_next} XP
            </span>
          </div>
          <ProgressBar value={xp} max={xp_next} height={8} color="var(--accent)" />
          <p className="text-[11px] text-white/40 mt-1">
            {xp_next - xp} XP para el siguiente nivel
          </p>
        </div>
      </div>

      {/* Achievements */}
      <div className="space-y-3">
        {/* Unlocked */}
        <div>
          <h4 className="text-sm font-semibold text-white/80 flex items-center gap-2 mb-2">
            <Trophy size={14} className="text-cyan-400" />
            Logros Desbloqueados
            <span className="text-xs text-white/40 font-normal">
              ({data.unlocked.length})
            </span>
          </h4>
          {data.unlocked.length === 0 ? (
            <p className="text-xs text-white/40 py-1">Aún no has desbloqueado logros.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.unlocked.map((ach) => (
                <div
                  key={ach.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/15 fade-in"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                    {resolveIcon(ach.icon)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white/80 truncate">
                      {ach.name}
                    </p>
                    <p className="text-[10px] text-white/50 line-clamp-2">
                      {ach.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Locked */}
        <div>
          <h4 className="text-sm font-semibold text-white/60 flex items-center gap-2 mb-2">
            <Lock size={14} className="text-white/30" />
            Bloqueados
            <span className="text-xs text-white/30 font-normal">
              ({data.locked.length})
            </span>
          </h4>
          {data.locked.length === 0 ? (
            <p className="text-xs text-white/40 py-1">No hay logros bloqueados.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.locked.map((ach) => (
                <div
                  key={ach.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] opacity-60"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30">
                    {resolveIcon(ach.icon)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white/50 truncate">
                      {ach.name}
                    </p>
                    <p className="text-[10px] text-white/30 line-clamp-2">
                      {ach.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div>
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
          Estadísticas
        </h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(statData).map(([key, value]) => {
            const labels: Record<string, string> = {
              chats: 'Chats',
              commands: 'Comandos',
              repos: 'Repos',
              notes: 'Notas',
              streak: 'Racha',
            };
            const statIcons: Record<string, React.ReactNode> = {
              chats: <MessageSquare size={10} />,
              commands: <TerminalIcon size={10} />,
              repos: <GitPullRequest size={10} />,
              notes: <Brain size={10} />,
              streak: <Zap size={10} />,
            };
            return (
              <Badge key={key} variant="default" className="gap-1.5">
                {statIcons[key]}
                <span className="text-white/70">{value}</span>
                <span className="text-white/40">{labels[key] || key}</span>
              </Badge>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/** Inline terminal icon since lucide-react doesn't export a size-10 easily */
function TerminalIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}
