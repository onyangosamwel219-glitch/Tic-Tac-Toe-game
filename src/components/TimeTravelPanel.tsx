import React, { useState } from 'react';
import { 
  History, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  FastForward, 
  Rewind,
  AlertTriangle,
  Play
} from 'lucide-react';
import { TurnSnapshot, GamePlayer } from '../types/game';
import { sound } from '../lib/sound';

interface TimeTravelPanelProps {
  snapshots: TurnSnapshot[];
  selectedTurnIndex: number;
  onSelectTurn: (index: number) => void;
  onRollback: (targetTurnIndex: number) => Promise<void>;
  playerX: GamePlayer;
  playerO: GamePlayer | null;
  disabled: boolean;
}

const POSITION_NAMES = [
  'Top Left (1)',
  'Top Center (2)',
  'Top Right (3)',
  'Middle Left (4)',
  'Center (5)',
  'Middle Right (6)',
  'Bottom Left (7)',
  'Bottom Center (8)',
  'Bottom Right (9)',
];

export const TimeTravelPanel: React.FC<TimeTravelPanelProps> = ({
  snapshots,
  selectedTurnIndex,
  onSelectTurn,
  onRollback,
  playerX,
  playerO,
  disabled,
}) => {
  const [isRollbackConfirmOpen, setIsRollbackConfirmOpen] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const totalSnapshots = snapshots.length;
  const liveTurnIndex = totalSnapshots - 1;
  const isViewingPast = selectedTurnIndex < liveTurnIndex;
  const currentSnapshot = snapshots[selectedTurnIndex] || snapshots[0];

  const handlePrev = () => {
    if (selectedTurnIndex > 0) {
      sound.playClick();
      onSelectTurn(selectedTurnIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedTurnIndex < liveTurnIndex) {
      sound.playClick();
      onSelectTurn(selectedTurnIndex + 1);
    }
  };

  const handleGoToLive = () => {
    sound.playClick();
    onSelectTurn(liveTurnIndex);
    setIsRollbackConfirmOpen(false);
  };

  const handleExecuteRollback = async () => {
    try {
      setIsRollingBack(true);
      sound.playRewind();
      // If selectedTurnIndex is 0 (start of game), we rollback to -1 (empty)
      // Otherwise targetTurnIndex is selectedTurnIndex - 1 (since snapshot 1 is move 0)
      const targetMoveIndex = selectedTurnIndex - 1;
      await onRollback(targetMoveIndex);
      setIsRollbackConfirmOpen(false);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 text-slate-200">
          <History className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold text-sm tracking-wide">Event Timeline (Event Sourcing)</h2>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
          {totalSnapshots - 1} {totalSnapshots - 1 === 1 ? 'Turn' : 'Turns'} Recorded
        </span>
      </div>

      {/* Scrubbing Navigation bar */}
      <div className="flex items-center justify-between gap-2 bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              sound.playClick();
              onSelectTurn(0);
            }}
            disabled={selectedTurnIndex === 0}
            title="Rewind to Game Start"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          >
            <Rewind className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrev}
            disabled={selectedTurnIndex === 0}
            title="Previous Turn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Current inspection label */}
        <div className="text-center">
          <div className="text-xs font-mono font-bold text-indigo-300">
            {selectedTurnIndex === 0 ? 'Turn 0 (Start)' : `Turn ${selectedTurnIndex}`}
          </div>
          <div className="text-[10px] text-slate-400">
            {selectedTurnIndex === liveTurnIndex ? (
              <span className="text-emerald-400 font-semibold">● Live Game</span>
            ) : (
              <span className="text-amber-400 font-semibold">Rewound ({liveTurnIndex - selectedTurnIndex} behind)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleNext}
            disabled={selectedTurnIndex === liveTurnIndex}
            title="Next Turn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleGoToLive}
            disabled={selectedTurnIndex === liveTurnIndex}
            title="Fast-forward to Live"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slider Scrubber */}
      {totalSnapshots > 1 && (
        <div className="px-1">
          <input
            type="range"
            min={0}
            max={liveTurnIndex}
            value={selectedTurnIndex}
            onChange={(e) => {
              const val = Number(e.target.value);
              sound.playClick();
              onSelectTurn(val);
            }}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
            <span>Start</span>
            <span>Live (T{liveTurnIndex})</span>
          </div>
        </div>
      )}

      {/* Snapshot details card */}
      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3 text-xs">
        {selectedTurnIndex === 0 ? (
          <div className="text-slate-400 flex items-center justify-between">
            <span>Initial game state</span>
            <span className="text-indigo-400 font-mono">X moves first</span>
          </div>
        ) : (
          currentSnapshot.lastMove && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Move played:</span>
                <span className="font-semibold text-slate-200">
                  {POSITION_NAMES[currentSnapshot.lastMove.position] || `Cell ${currentSnapshot.lastMove.position + 1}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">By player:</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono font-bold px-1.5 py-0.2 rounded text-[11px] ${
                      currentSnapshot.lastMove.player === 'X'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {currentSnapshot.lastMove.player}
                  </span>
                  <span className="text-slate-300 truncate max-w-[130px]">
                    {currentSnapshot.lastMove.player === 'X'
                      ? playerX.name
                      : playerO?.name || 'Player O'}
                  </span>
                </div>
              </div>
              {currentSnapshot.winner && (
                <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-amber-300 font-semibold">
                  <span>Result at this turn:</span>
                  <span>
                    {currentSnapshot.winner === 'draw'
                      ? 'Game ended in Draw'
                      : `Player ${currentSnapshot.winner} won!`}
                  </span>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Rollback & Time-travel Actions */}
      {isViewingPast && (
        <div className="flex flex-col gap-2 pt-1 animate-in fade-in duration-200">
          {!isRollbackConfirmOpen ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGoToLive}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Return to Live</span>
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setIsRollbackConfirmOpen(true)}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Roll Back Here</span>
              </button>
            </div>
          ) : (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-start gap-2 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Restore match state to <strong>Turn {selectedTurnIndex}</strong>? All subsequent moves ({liveTurnIndex - selectedTurnIndex}) will be removed.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setIsRollbackConfirmOpen(false)}
                  disabled={isRollingBack}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRollback}
                  disabled={isRollingBack}
                  className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-amber-950/60"
                >
                  {isRollingBack ? 'Restoring...' : 'Confirm Rollback'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List of past turns (Scrollable) */}
      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Turn History
        </div>
        {snapshots.map((snap, idx) => {
          const isSelected = selectedTurnIndex === idx;
          const isLive = idx === liveTurnIndex;

          return (
            <button
              key={idx}
              onClick={() => {
                sound.playClick();
                onSelectTurn(idx);
              }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-200'
                  : 'bg-slate-950/30 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-400">
                  #{idx}
                </span>
                {idx === 0 ? (
                  <span className="font-medium">Game Started</span>
                ) : (
                  <span className="font-medium flex items-center gap-1.5">
                    <span
                      className={`font-mono text-[10px] px-1 rounded ${
                        snap.lastMove?.player === 'X'
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {snap.lastMove?.player}
                    </span>
                    <span className="text-slate-300">
                      {POSITION_NAMES[snap.lastMove?.position ?? 0] || `Cell ${Number(snap.lastMove?.position) + 1}`}
                    </span>
                  </span>
                )}
              </div>

              {isLive && (
                <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono">
                  LIVE
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
