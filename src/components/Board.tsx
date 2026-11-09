import React from 'react';
import { BoardState, PlayerMark } from '../types/game';

interface BoardProps {
  board: BoardState;
  onCellClick: (index: number) => void;
  winningLine: number[] | null;
  currentTurn: PlayerMark;
  myMark: PlayerMark | null;
  isMyTurn: boolean;
  disabled: boolean;
  isTimeTravel: boolean;
  lastMovePosition?: number;
}

export const Board: React.FC<BoardProps> = ({
  board,
  onCellClick,
  winningLine,
  myMark,
  isMyTurn,
  disabled,
  isTimeTravel,
  lastMovePosition,
}) => {
  return (
    <div className="relative mx-auto w-full max-w-[380px] sm:max-w-[420px] aspect-square select-none p-3 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl">
      {/* Background glow behind board */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-500/10 via-transparent to-emerald-500/10 pointer-events-none" />

      {/* Grid container */}
      <div className="relative w-full h-full grid grid-cols-3 grid-rows-3 gap-2.5 sm:gap-3">
        {board.map((cell, index) => {
          const isWinningCell = winningLine?.includes(index);
          const isLastMove = lastMovePosition === index;
          const isCellEmpty = cell === null;
          const canInteract = !disabled && isMyTurn && isCellEmpty && !isTimeTravel;

          return (
            <button
              key={index}
              type="button"
              disabled={!canInteract}
              onClick={() => onCellClick(index)}
              className={`
                group relative flex items-center justify-center rounded-2xl transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                ${
                  isWinningCell
                    ? 'bg-gradient-to-br from-amber-500/20 via-indigo-600/30 to-emerald-500/20 border-2 border-amber-400/80 shadow-lg shadow-amber-500/20 scale-[1.02]'
                    : isLastMove
                    ? 'bg-slate-800/90 border border-indigo-500/50 shadow-inner ring-1 ring-indigo-500/30'
                    : 'bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/80 hover:bg-slate-800/70'
                }
                ${canInteract ? 'cursor-pointer active:scale-95' : 'cursor-default'}
              `}
              aria-label={`Cell ${index + 1}, ${cell ? cell : 'empty'}`}
            >
              {/* Index hint number in corner */}
              <span className="absolute top-1.5 left-2 text-[10px] font-mono text-slate-400 select-none">
                {index + 1}
              </span>

              {/* Render Cell Mark */}
              {cell === 'X' && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    className="w-full h-full transform animate-in zoom-in-75 duration-150"
                  >
                    <line x1="5" y1="5" x2="19" y2="19" />
                    <line x1="19" y1="5" x2="5" y2="19" />
                  </svg>
                </div>
              )}

              {cell === 'O' && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    className="w-full h-full transform animate-in zoom-in-75 duration-150"
                  >
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                </div>
              )}

              {/* Ghost preview on hover when it's player's turn */}
              {isCellEmpty && canInteract && (
                <div className="opacity-0 group-hover:opacity-35 transition-opacity duration-150 pointer-events-none">
                  {myMark === 'X' ? (
                    <div className="w-12 h-12 text-indigo-400">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="w-full h-full"
                      >
                        <line x1="5" y1="5" x2="19" y2="19" />
                        <line x1="19" y1="5" x2="5" y2="19" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-12 h-12 text-emerald-400">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="w-full h-full"
                      >
                        <circle cx="12" cy="12" r="8" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Time travel indicator ribbon */}
      {isTimeTravel && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold backdrop-blur-md shadow-lg shadow-amber-950/50 flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Historical State (Read Only)</span>
        </div>
      )}
    </div>
  );
};
