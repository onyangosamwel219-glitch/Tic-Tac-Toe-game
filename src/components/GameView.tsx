import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  ArrowLeft, 
  Share2, 
  Users, 
  Bot, 
  Copy, 
  Check, 
  RotateCcw, 
  History, 
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  GameDoc, 
  GameEvent, 
  PlayerMark, 
  GameWinner,
  ReconstructedState 
} from '../types/game';
import { Board } from './Board';
import { TimeTravelPanel } from './TimeTravelPanel';
import { ShareModal } from './ShareModal';
import { GameOverModal } from './GameOverModal';
import { sound } from '../lib/sound';
import { calculateAiMove } from '../lib/minimax';
import { 
  reconstructGameState, 
  commitMoveEvent, 
  rollbackGameToTurn,
  subscribeToGameEvents 
} from '../lib/eventSourcing';
import { recordGameResult, subscribeToGame } from '../lib/gameService';

interface GameViewProps {
  initialGame: GameDoc;
  currentUser: User;
  onExit: () => void;
  onRestartAiMatch?: (difficulty?: string) => Promise<void>;
}

export const GameView: React.FC<GameViewProps> = ({
  initialGame,
  currentUser,
  onExit,
  onRestartAiMatch,
}) => {
  const [game, setGame] = useState<GameDoc>(initialGame);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [selectedTurnIndex, setSelectedTurnIndex] = useState<number>(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Track if result was already recorded for this game to avoid duplicate counts
  const hasRecordedResult = useRef<boolean>(false);
  const aiMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Subscribe to the Game document changes in real time
  useEffect(() => {
    const unsubscribeGame = subscribeToGame(initialGame.id, (updatedGame) => {
      if (updatedGame) {
        setGame(updatedGame);
      }
    });
    return () => unsubscribeGame();
  }, [initialGame.id]);

  // 2. Subscribe to the Events subcollection (Event Sourcing)
  useEffect(() => {
    const unsubscribeEvents = subscribeToGameEvents(initialGame.id, (newEvents) => {
      setEvents(newEvents);
      // Automatically keep the view on live unless the player is actively time-traveling
      setSelectedTurnIndex(newEvents.length);
    });
    return () => unsubscribeEvents();
  }, [initialGame.id]);

  // 3. Reconstruct State dynamically from the events subcollection
  const reconstructed: ReconstructedState = reconstructGameState(events);

  // Determine which snapshot is currently being viewed
  const liveTurnIndex = reconstructed.snapshots.length - 1;
  const isTimeTraveling = selectedTurnIndex < liveTurnIndex;
  const viewedSnapshot = reconstructed.snapshots[selectedTurnIndex] || reconstructed.snapshots[liveTurnIndex];

  // Current active board and winner based on time-travel or live
  const activeBoard = isTimeTraveling ? viewedSnapshot.board : reconstructed.board;
  const activeWinner: GameWinner = isTimeTraveling ? viewedSnapshot.winner : reconstructed.winner;
  const activeWinningLine = isTimeTraveling ? viewedSnapshot.winningLine : reconstructed.winningLine;

  // Determine player's role
  const isPlayerX = currentUser.uid === game.playerXId;
  const isPlayerO = currentUser.uid === game.playerOId;
  const myMark: PlayerMark | null = isPlayerX ? 'X' : isPlayerO ? 'O' : null;
  const isMyTurn = !reconstructed.isGameOver && game.status === 'in_progress' && reconstructed.currentTurn === myMark;

  // 4. Handle Game Over and record statistics
  useEffect(() => {
    if (reconstructed.isGameOver && !hasRecordedResult.current) {
      hasRecordedResult.current = true;
      setIsGameOverModalOpen(true);

      if (reconstructed.winner === 'draw') {
        recordGameResult(currentUser.uid, 'tied');
      } else if (reconstructed.winner === myMark) {
        recordGameResult(currentUser.uid, 'won');
      } else if (myMark !== null) {
        recordGameResult(currentUser.uid, 'lost');
      }
    } else if (!reconstructed.isGameOver) {
      // If rolled back from a finished game, reset the recorded flag
      hasRecordedResult.current = false;
    }
  }, [reconstructed.isGameOver, reconstructed.winner, myMark, currentUser.uid]);

  // 5. Minimax AI Turn Automation
  useEffect(() => {
    if (
      game.mode === 'ai' &&
      game.status === 'in_progress' &&
      reconstructed.currentTurn === 'O' &&
      !reconstructed.isGameOver &&
      !isTimeTraveling &&
      !isAiThinking
    ) {
      setIsAiThinking(true);

      // Brief human-like pause for realism
      aiMoveTimeoutRef.current = setTimeout(async () => {
        try {
          const aiMovePosition = calculateAiMove(
            reconstructed.board,
            'O',
            game.aiDifficulty || 'hard'
          );

          if (aiMovePosition >= 0) {
            sound.playMove('O');
            await commitMoveEvent(game, aiMovePosition, 'O', 'ai_bot', events);
          }
        } catch (err) {
          console.error('AI move failed:', err);
        } finally {
          setIsAiThinking(false);
        }
      }, 550);
    }

    return () => {
      if (aiMoveTimeoutRef.current) {
        clearTimeout(aiMoveTimeoutRef.current);
      }
    };
  }, [
    game.mode,
    game.status,
    game.aiDifficulty,
    reconstructed.currentTurn,
    reconstructed.isGameOver,
    reconstructed.board,
    isTimeTraveling,
    events,
    isAiThinking,
    game,
  ]);

  // 6. Player cell click handler
  const handleCellClick = async (position: number) => {
    if (!myMark || !isMyTurn || activeBoard[position] !== null || isTimeTraveling || isAiThinking) {
      return;
    }

    try {
      setMoveError(null);
      sound.playMove(myMark);
      await commitMoveEvent(game, position, myMark, currentUser.uid, events);
    } catch (err: unknown) {
      setMoveError(err instanceof Error ? err.message : 'Failed to register move.');
    }
  };

  // 7. Rollback to target turn handler
  const handleRollback = async (targetTurnIndex: number) => {
    try {
      setMoveError(null);
      await rollbackGameToTurn(game.id, targetTurnIndex, events);
      setSelectedTurnIndex(targetTurnIndex + 1);
    } catch (err: unknown) {
      setMoveError(err instanceof Error ? err.message : 'Rollback failed.');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(game.shortCode);
      sound.playClick();
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Player cards data
  const playerXData = {
    id: game.playerXId,
    name: game.playerXName,
    photoURL: game.playerXPhoto,
    isAi: false,
  };

  const playerOData = game.playerOId
    ? {
        id: game.playerOId,
        name: game.playerOName || 'Player O',
        photoURL: game.playerOPhoto,
        isAi: game.playerOIsAi,
      }
    : null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6">
      {/* Top action navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition cursor-pointer text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Lobby</span>
        </button>

        {/* Short Code & Share Controls */}
        <div className="flex items-center gap-2">
          {game.mode === 'pvp' && (
            <button
              onClick={handleCopyCode}
              title="Click to copy match code"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 text-slate-300 text-xs font-mono transition cursor-pointer"
            >
              <span className="text-slate-400">Code:</span>
              <strong className="text-indigo-300 font-bold tracking-wider">{game.shortCode}</strong>
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          )}

          {game.mode === 'pvp' && game.status === 'waiting' && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Invite</span>
            </button>
          )}

          {/* Mode Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs">
            {game.mode === 'ai' ? (
              <>
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <span className="capitalize">{game.aiDifficulty} Minimax AI</span>
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Multiplayer Match</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error notification if any */}
      {moveError && (
        <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{moveError}</span>
        </div>
      )}

      {/* If waiting for opponent in PvP */}
      {game.mode === 'pvp' && game.status === 'waiting' && !game.playerOId && (
        <div className="rounded-3xl bg-slate-900/70 border border-indigo-500/30 p-6 sm:p-8 flex flex-col items-center text-center gap-5 backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center animate-pulse">
            <Users className="w-8 h-8" />
          </div>

          <div className="max-w-md flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-white">Waiting for Player O</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Share the match code below with a friend. Once they enter it, the match will begin immediately.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2">
            <span className="text-[11px] font-mono uppercase text-slate-400">Match Code</span>
            <span className="text-3xl sm:text-4xl font-mono font-black tracking-[0.3em] text-indigo-300 pl-2">
              {game.shortCode}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyCode}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Invite Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Players Header & Turn Indicator */}
      {(game.status !== 'waiting' || game.playerOId) && (
        <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 p-4 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          {/* Player X Card */}
          <div
            className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl transition-all ${
              reconstructed.currentTurn === 'X' && !reconstructed.isGameOver
                ? 'bg-indigo-950/40 border border-indigo-500/50 ring-2 ring-indigo-500/20'
                : 'bg-slate-950/40 border border-slate-800/80'
            }`}
          >
            <div className="relative">
              {game.playerXPhoto ? (
                <img
                  src={game.playerXPhoto}
                  alt={game.playerXName}
                  className="w-10 h-10 rounded-full border border-indigo-500/40 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300">
                  X
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-indigo-600 text-white font-mono text-xs font-black flex items-center justify-center shadow">
                X
              </span>
            </div>
            <div className="truncate">
              <div className="text-xs sm:text-sm font-bold text-slate-200 truncate flex items-center gap-1.5">
                <span>{game.playerXName}</span>
                {currentUser.uid === game.playerXId && (
                  <span className="text-[10px] text-indigo-400 font-semibold">(You)</span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                {reconstructed.currentTurn === 'X' && !reconstructed.isGameOver ? (
                  <span className="text-indigo-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    Turn to move
                  </span>
                ) : (
                  'Waiting'
                )}
              </div>
            </div>
          </div>

          {/* Versus Center Badge */}
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
              VS
            </span>
            {isAiThinking ? (
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI Calculating...</span>
              </div>
            ) : isTimeTraveling ? (
              <div className="text-[11px] text-amber-400 font-mono font-semibold mt-1">
                Viewing Turn {selectedTurnIndex}
              </div>
            ) : reconstructed.isGameOver ? (
              <div className="text-[11px] text-amber-300 font-semibold mt-1">
                Match Ended
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 font-mono mt-1">
                Turn {reconstructed.totalTurns + 1}
              </div>
            )}
          </div>

          {/* Player O Card */}
          <div
            className={`flex items-center justify-end gap-3 p-2.5 sm:p-3 rounded-2xl transition-all text-right ${
              reconstructed.currentTurn === 'O' && !reconstructed.isGameOver
                ? 'bg-emerald-950/40 border border-emerald-500/50 ring-2 ring-emerald-500/20'
                : 'bg-slate-950/40 border border-slate-800/80'
            }`}
          >
            <div className="truncate">
              <div className="text-xs sm:text-sm font-bold text-slate-200 truncate flex items-center justify-end gap-1.5">
                {currentUser.uid === game.playerOId && (
                  <span className="text-[10px] text-emerald-400 font-semibold">(You)</span>
                )}
                <span>{game.playerOName || 'Waiting...'}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {reconstructed.currentTurn === 'O' && !reconstructed.isGameOver ? (
                  <span className="text-emerald-400 font-semibold flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Turn to move
                  </span>
                ) : (
                  'Waiting'
                )}
              </div>
            </div>
            <div className="relative">
              {game.playerOPhoto ? (
                <img
                  src={game.playerOPhoto}
                  alt={game.playerOName || 'Player O'}
                  className="w-10 h-10 rounded-full border border-emerald-500/40 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-300">
                  O
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-emerald-600 text-white font-mono text-xs font-black flex items-center justify-center shadow">
                O
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Playing Area: Board + Time Travel Panel */}
      {(game.status !== 'waiting' || game.playerOId) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: The Board (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col items-center gap-4">
            <Board
              board={activeBoard}
              onCellClick={handleCellClick}
              winningLine={activeWinningLine}
              currentTurn={reconstructed.currentTurn}
              myMark={myMark}
              isMyTurn={isMyTurn}
              disabled={reconstructed.isGameOver || isAiThinking}
              isTimeTravel={isTimeTraveling}
              lastMovePosition={viewedSnapshot.lastMove?.position}
            />

            {/* Quick status subtitle below board */}
            <div className="text-xs text-slate-400 text-center flex items-center justify-center gap-2">
              {isTimeTraveling ? (
                <span className="text-amber-400 font-semibold">
                  Viewing snapshot from turn {selectedTurnIndex}. Click "Return to Live" to play.
                </span>
              ) : reconstructed.isGameOver ? (
                <span className="text-slate-300">
                  Game finished! Open the Timeline to inspect turns or rollback.
                </span>
              ) : isMyTurn ? (
                <span className="text-emerald-400 font-semibold animate-pulse">
                  It's your turn! Pick an empty square on the grid.
                </span>
              ) : (
                <span>
                  Waiting for {reconstructed.currentTurn === 'X' ? game.playerXName : game.playerOName || 'Player O'}...
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Time Travel & Event Sourcing Panel (5 cols on lg) */}
          <div className="lg:col-span-5">
            <TimeTravelPanel
              snapshots={reconstructed.snapshots}
              selectedTurnIndex={selectedTurnIndex}
              onSelectTurn={(index) => setSelectedTurnIndex(index)}
              onRollback={handleRollback}
              playerX={playerXData}
              playerO={playerOData}
              disabled={isAiThinking}
            />
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        game={game}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Game Over Modal */}
      <GameOverModal
        game={game}
        winner={reconstructed.winner}
        myMark={myMark}
        isOpen={isGameOverModalOpen}
        onClose={() => setIsGameOverModalOpen(false)}
        onPlayAgain={async () => {
          setIsGameOverModalOpen(false);
          if (game.mode === 'ai' && onRestartAiMatch) {
            await onRestartAiMatch(game.aiDifficulty);
          } else {
            onExit();
          }
        }}
        onViewReplay={() => {
          setIsGameOverModalOpen(false);
          // Rewind to turn 0 so the user can step through the whole replay!
          setSelectedTurnIndex(0);
        }}
      />
    </div>
  );
};
