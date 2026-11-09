import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, Eye, X, Award, Frown, Equal } from 'lucide-react';
import { GameDoc, GameWinner, PlayerMark } from '../types/game';
import { sound } from '../lib/sound';

interface GameOverModalProps {
  game: GameDoc;
  winner: GameWinner;
  myMark: PlayerMark | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  onViewReplay: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  game,
  winner,
  myMark,
  isOpen,
  onClose,
  onPlayAgain,
  onViewReplay,
}) => {
  useEffect(() => {
    if (isOpen && winner) {
      if (winner === 'draw') {
        sound.playDraw();
      } else {
        sound.playWin();
        const isMeWinner = myMark === winner;
        // Fire confetti if the current player won or in AI mode
        if (isMeWinner || game.mode === 'ai') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: winner === 'X' ? ['#6366f1', '#818cf8', '#a5b4fc'] : ['#10b981', '#34d399', '#6ee7b7'],
          });
        }
      }
    }
  }, [isOpen, winner, myMark, game.mode]);

  if (!isOpen || !winner) return null;

  const isDraw = winner === 'draw';
  const winnerName = winner === 'X' ? game.playerXName : game.playerOName;
  const isMe = myMark === winner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl shadow-indigo-950/60 flex flex-col items-center text-center gap-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Badge */}
        <div className="mt-2">
          {isDraw ? (
            <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shadow-lg shadow-slate-900/50">
              <Equal className="w-8 h-8" />
            </div>
          ) : isMe ? (
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-indigo-600/30 to-emerald-500/20 border border-amber-400/60 text-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 text-indigo-400 flex items-center justify-center shadow-lg shadow-slate-900/50">
              <Award className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Headings */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-2xl font-black tracking-tight text-white">
            {isDraw ? (
              "It's a Stalemate!"
            ) : isMe ? (
              <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-indigo-200 bg-clip-text text-transparent">
                Victory Is Yours!
              </span>
            ) : (
              `${winnerName || `Player ${winner}`} Won!`
            )}
          </h3>
          <p className="text-xs text-slate-400">
            {isDraw
              ? 'Every square on the board was fiercely contested.'
              : `A decisive finish by mark ${winner} in ${game.turnCount} turns.`}
          </p>
        </div>

        {/* Winner mark badge */}
        {!isDraw && (
          <div className="px-4 py-2 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <span
              className={`font-mono text-xl font-black px-2.5 py-0.5 rounded-xl ${
                winner === 'X'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {winner}
            </span>
            <div className="text-left text-xs">
              <div className="font-semibold text-slate-200">{winnerName}</div>
              <div className="text-[10px] text-slate-400">Winner</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2 mt-2">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Play Another Match</span>
          </button>

          <button
            onClick={() => {
              onViewReplay();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Review Turns & Time Travel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
