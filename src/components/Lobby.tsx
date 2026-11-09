import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { 
  Bot, 
  Users, 
  Play, 
  KeyRound, 
  ShieldCheck, 
  History, 
  Sparkles, 
  LogIn,
  Swords,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';
import { GameMode, AiDifficulty, UserProfile } from '../types/game';
import { sound } from '../lib/sound';

interface LobbyProps {
  user: User | null;
  profile: UserProfile | null;
  onLogin: () => void;
  onCreateGame: (mode: GameMode, difficulty?: AiDifficulty) => Promise<void>;
  onJoinByCode: (code: string) => Promise<void>;
  initialCode?: string;
}

export const Lobby: React.FC<LobbyProps> = ({
  user,
  profile,
  onLogin,
  onCreateGame,
  onJoinByCode,
  initialCode = '',
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<AiDifficulty>('hard');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleStartAi = async () => {
    if (!user) {
      onLogin();
      return;
    }
    try {
      setIsCreating(true);
      sound.playClick();
      await onCreateGame('ai', selectedDifficulty);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartPvp = async () => {
    if (!user) {
      onLogin();
      return;
    }
    try {
      setIsCreating(true);
      sound.playClick();
      await onCreateGame('pvp');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    if (!user) {
      onLogin();
      return;
    }

    try {
      setJoinError(null);
      setIsJoining(true);
      sound.playClick();
      await onJoinByCode(joinCode.trim().toUpperCase());
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Match not found or already ended.');
    } finally {
      setIsJoining(false);
    }
  };

  const winRate = profile && profile.gamesPlayed > 0 
    ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) 
    : 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col gap-8">
      {/* Hero Banner */}
      <div className="relative text-center flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Real-time Multiplayer & Time-Travel Rollback</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white max-w-2xl">
          Master the Grid with{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-emerald-400 bg-clip-text text-transparent">
            Event-Sourced
          </span>{' '}
          Tic-Tac-Toe
        </h1>

        <p className="text-slate-400 text-sm sm:text-base max-w-xl">
          Powered by Firebase Firestore and pure mathematical Minimax AI. Replay past turns and roll back states with full time-travel capability.
        </p>

        {/* Auth prompt if not logged in */}
        {!user && (
          <div className="mt-4 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 max-w-md w-full flex flex-col items-center gap-3 shadow-xl">
            <div className="text-xs text-indigo-200">
              Sign in with Google to start matches, play friends, and record your stats.
            </div>
            <button
              onClick={onLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Game Mode Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Play vs Minimax AI */}
        <div className="relative rounded-3xl bg-slate-900/70 border border-slate-800 p-6 flex flex-col justify-between gap-6 backdrop-blur-xl shadow-xl hover:border-slate-700/80 transition group">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                Solo Mode
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Play vs Minimax AI
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Challenge an algorithm-driven opponent using classic minimax tree search. No LLMs or tokens required.
              </p>
            </div>

            {/* Difficulty Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">
                Select AI Intelligence:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'easy', label: 'Casual', desc: 'Relaxed' },
                    { id: 'medium', label: 'Tactician', desc: 'Smart' },
                    { id: 'hard', label: 'Minimax', desc: 'Unbeatable' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedDifficulty(d.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col ${
                      selectedDifficulty === d.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950/50'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-xs font-bold">{d.label}</span>
                    <span className="text-[10px] opacity-75">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleStartAi}
            disabled={isCreating}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/25 active:scale-[0.98] disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isCreating ? 'Setting Up...' : 'Start AI Match'}</span>
          </button>
        </div>

        {/* Card 2: Play Multiplayer (PvP) */}
        <div className="relative rounded-3xl bg-slate-900/70 border border-slate-800 p-6 flex flex-col justify-between gap-6 backdrop-blur-xl shadow-xl hover:border-slate-700/80 transition group">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full bg-slate-800 text-emerald-300 border border-slate-700">
                Multiplayer
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Challenge a Friend
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Generate an instant short match code or share link. Real-time turn sync over Firebase Firestore.
              </p>
            </div>

            {/* Quick Join Sub-form */}
            <form onSubmit={handleJoin} className="flex flex-col gap-2 mt-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                Have a Game Code?
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={10}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. K7M2PX"
                  className="flex-1 bg-slate-950/80 border border-slate-700/70 rounded-xl px-3 py-2 text-sm font-mono tracking-wider text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isJoining || !joinCode.trim()}
                  className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-40"
                >
                  <span>{isJoining ? 'Joining...' : 'Join'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {joinError && (
                <span className="text-[11px] text-rose-400 mt-0.5">{joinError}</span>
              )}
            </form>
          </div>

          <button
            onClick={handleStartPvp}
            disabled={isCreating}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-600/25 active:scale-[0.98] disabled:opacity-50"
          >
            <Swords className="w-4 h-4" />
            <span>{isCreating ? 'Generating Match...' : 'Create Multiplayer Room'}</span>
          </button>
        </div>
      </div>

      {/* User Stats Card (if signed in) */}
      {user && profile && (
        <div className="rounded-3xl bg-slate-900/50 border border-slate-800/80 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Career Record</span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Win Rate: <strong className="text-emerald-400">{winRate}%</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3">
              <div className="text-xl font-black font-mono text-slate-100">{profile.gamesPlayed}</div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Played</div>
            </div>
            <div className="bg-slate-950/60 border border-emerald-950/40 rounded-2xl p-3">
              <div className="text-xl font-black font-mono text-emerald-400">{profile.gamesWon}</div>
              <div className="text-[11px] text-emerald-400/80 uppercase font-medium">Won</div>
            </div>
            <div className="bg-slate-950/60 border border-rose-950/40 rounded-2xl p-3">
              <div className="text-xl font-black font-mono text-rose-400">{profile.gamesLost}</div>
              <div className="text-[11px] text-rose-400/80 uppercase font-medium">Lost</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3">
              <div className="text-xl font-black font-mono text-slate-300">{profile.gamesTied}</div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Draws</div>
            </div>
          </div>
        </div>
      )}

      {/* Event Sourcing Deep Dive Explainer */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950/30 via-slate-900/40 to-slate-900/40 border border-indigo-500/20 p-5 flex flex-col sm:flex-row items-center gap-4 text-xs text-slate-300">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
          <History className="w-6 h-6" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="font-bold text-white text-sm mb-1">
            Built with Event Sourcing Architecture
          </div>
          <p className="text-slate-400 leading-relaxed">
            Every move is recorded as an immutable event document inside a Firestore subcollection (<code className="text-indigo-300 font-mono text-[11px]">games/{'{gameId}'}/events</code>). The board state is reconstructed dynamically by replaying the event stream, enabling instantaneous turn scrubbing and seamless state rollbacks.
          </p>
        </div>
      </div>
    </div>
  );
};
