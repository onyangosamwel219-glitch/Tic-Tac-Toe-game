import React from 'react';
import { User } from 'firebase/auth';
import { LogIn, LogOut, Volume2, VolumeX, Sparkles, User as UserIcon } from 'lucide-react';
import { UserProfile } from '../types/game';
import { sound } from '../lib/sound';

interface NavbarProps {
  user: User | null;
  profile: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  onGoHome: () => void;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  profile,
  onLogin,
  onLogout,
  onGoHome,
  isAudioEnabled,
  onToggleAudio,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-3 text-left group transition cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/20 group-hover:scale-105 transition-transform">
            <span className="font-mono font-black text-xl tracking-tighter text-white flex items-center">
              <span className="text-indigo-200">X</span>
              <span className="text-emerald-300">O</span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                CHRONOS
              </span>
              <span className="text-xs uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Time-Travel
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Event-Sourced Tic-Tac-Toe
            </p>
          </div>
        </button>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Audio toggle button */}
          <button
            onClick={() => {
              onToggleAudio();
              sound.playClick();
            }}
            title={isAudioEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition cursor-pointer"
          >
            {isAudioEnabled ? (
              <Volume2 className="w-4 h-4 text-indigo-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* User authentication info */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800/80">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Player'}
                    className="w-8 h-8 rounded-full border border-indigo-500/40 object-cover ring-2 ring-indigo-500/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-600/40 flex items-center justify-center text-indigo-300">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.displayName || 'Player'}
                  </div>
                  {profile && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <span className="text-emerald-400 font-bold">{profile.gamesWon}W</span>
                      <span>-</span>
                      <span className="text-rose-400 font-bold">{profile.gamesLost}L</span>
                      <span>-</span>
                      <span className="text-slate-400">{profile.gamesTied}T</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-rose-400 hover:border-rose-900/40 hover:bg-rose-950/20 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs tracking-wide shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transition cursor-pointer border border-indigo-400/30"
            >
              <LogIn className="w-4 h-4" />
              <span>Google Sign-In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
