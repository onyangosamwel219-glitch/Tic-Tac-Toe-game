import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  writeBatch,
  query, 
  orderBy, 
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { checkBoardWinner } from './minimax';
import { 
  BoardState, 
  GameDoc, 
  GameEvent, 
  PlayerMark, 
  ReconstructedState, 
  TurnSnapshot 
} from '../types/game';

/**
 * Reconstructs the complete game state by replaying every event in order.
 * This is the heart of the Event Sourcing pattern.
 */
export function reconstructGameState(events: GameEvent[]): ReconstructedState {
  // Sort events strictly by turnIndex ascending
  const sortedEvents = [...events].sort((a, b) => a.turnIndex - b.turnIndex);

  const board: BoardState = Array(9).fill(null);
  let currentTurn: PlayerMark = 'X';
  let winner: 'X' | 'O' | 'draw' | null = null;
  let winningLine: number[] | null = null;

  const snapshots: TurnSnapshot[] = [
    {
      turnIndex: 0,
      board: [...board],
      nextTurn: 'X',
      winner: null,
      winningLine: null,
    }
  ];

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];

    if (event.type === 'MOVE') {
      if (event.position >= 0 && event.position < 9) {
        board[event.position] = event.player;
      }
      currentTurn = event.player === 'X' ? 'O' : 'X';

      const check = checkBoardWinner(board);
      winner = check.winner;
      winningLine = check.line;

      snapshots.push({
        turnIndex: event.turnIndex + 1,
        board: [...board],
        nextTurn: currentTurn,
        lastMove: {
          player: event.player,
          position: event.position,
          playerId: event.playerId,
          timestamp: event.createdAt,
        },
        winner: check.winner,
        winningLine: check.line,
      });
    }
  }

  return {
    board,
    currentTurn,
    winner,
    winningLine,
    isGameOver: winner !== null,
    moveEvents: sortedEvents.filter(e => e.type === 'MOVE'),
    snapshots,
    totalTurns: snapshots.length - 1,
  };
}

/**
 * Listens in real-time to the events subcollection of a game.
 */
export function subscribeToGameEvents(
  gameId: string, 
  onEventsUpdate: (events: GameEvent[]) => void
): () => void {
  const eventsCollectionRef = collection(db, 'games', gameId, 'events');
  const q = query(eventsCollectionRef, orderBy('turnIndex', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const events: GameEvent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        events.push({
          id: docSnap.id,
          gameId: data.gameId || gameId,
          type: data.type || 'MOVE',
          turnIndex: typeof data.turnIndex === 'number' ? data.turnIndex : 0,
          player: data.player as PlayerMark,
          playerId: data.playerId,
          position: data.position,
          targetTurnIndex: data.targetTurnIndex,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      onEventsUpdate(events);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `games/${gameId}/events`);
    }
  );
}

/**
 * Commits a move event into the subcollection and synchronizes the game doc state.
 */
export async function commitMoveEvent(
  game: GameDoc,
  position: number,
  player: PlayerMark,
  playerId: string,
  currentEvents: GameEvent[]
): Promise<void> {
  const turnIndex = currentEvents.length;
  const eventId = `move_${turnIndex}_${Date.now()}`;
  const now = new Date().toISOString();

  const newEvent: GameEvent = {
    id: eventId,
    gameId: game.id,
    type: 'MOVE',
    turnIndex,
    player,
    playerId,
    position,
    createdAt: now,
  };

  // Pre-calculate what the next state will look like
  const simulatedEvents = [...currentEvents, newEvent];
  const reconstructed = reconstructGameState(simulatedEvents);

  const nextTurn = reconstructed.currentTurn;
  const winner = reconstructed.winner;
  const status = winner ? 'completed' : 'in_progress';

  try {
    const eventDocRef = doc(db, 'games', game.id, 'events', eventId);
    await setDoc(eventDocRef, newEvent);

    const gameDocRef = doc(db, 'games', game.id);
    await updateDoc(gameDocRef, {
      turnCount: turnIndex + 1,
      currentTurn: nextTurn,
      winner: winner || 'none',
      winningLine: reconstructed.winningLine || null,
      status,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${game.id}/events/${eventId}`);
  }
}

/**
 * Rolls back the game to a prior turn's state:
 * Deletes all events after targetTurnIndex and updates the game state document.
 */
export async function rollbackGameToTurn(
  gameId: string,
  targetTurnIndex: number, // 0-based turn index to keep (e.g., targetTurnIndex = 2 keeps moves 0, 1, 2)
  currentEvents: GameEvent[]
): Promise<void> {
  const eventsToDelete = currentEvents.filter(e => e.turnIndex > targetTurnIndex);
  const eventsRemaining = currentEvents.filter(e => e.turnIndex <= targetTurnIndex);

  const batch = writeBatch(db);

  for (const event of eventsToDelete) {
    const ref = doc(db, 'games', gameId, 'events', event.id);
    batch.delete(ref);
  }

  // Reconstruct remaining state
  const reconstructed = reconstructGameState(eventsRemaining);
  const now = new Date().toISOString();

  const gameRef = doc(db, 'games', gameId);
  batch.update(gameRef, {
    turnCount: eventsRemaining.length,
    currentTurn: reconstructed.currentTurn,
    winner: reconstructed.winner || 'none',
    winningLine: reconstructed.winningLine || null,
    status: 'in_progress',
    updatedAt: now,
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}`);
  }
}
