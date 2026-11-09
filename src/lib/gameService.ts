import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { GameDoc, GameMode, AiDifficulty, UserProfile, PlayerMark } from '../types/game';

// Generate a memorable 6-character uppercase short code (e.g. "K7M2PX")
export function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omits I, O, 1, 0 to avoid visual confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Creates a new Game match in Firestore
 */
export async function createNewGame(params: {
  mode: GameMode;
  aiDifficulty?: AiDifficulty;
  user: {
    uid: string;
    displayName: string;
    photoURL?: string | null;
  };
}): Promise<GameDoc> {
  const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const shortCode = generateShortCode();
  const now = new Date().toISOString();

  const isAi = params.mode === 'ai';

  const gameData: GameDoc = {
    id: gameId,
    shortCode,
    mode: params.mode,
    aiDifficulty: params.aiDifficulty || 'hard',
    status: isAi ? 'in_progress' : 'waiting',
    playerXId: params.user.uid,
    playerXName: params.user.displayName || 'Player X',
    playerXPhoto: params.user.photoURL || null,
    playerOId: isAi ? 'ai_bot' : null,
    playerOName: isAi ? `Minimax AI (${(params.aiDifficulty || 'hard').toUpperCase()})` : null,
    playerOPhoto: isAi ? 'https://api.dicebear.com/7.x/bottts/svg?seed=Minimax' : null,
    playerOIsAi: isAi,
    currentTurn: 'X' as PlayerMark,
    winner: 'none',
    winningLine: null,
    turnCount: 0,
    createdBy: params.user.uid,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const gameRef = doc(db, 'games', gameId);
    await setDoc(gameRef, gameData);
    return gameData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}`);
  }
}

/**
 * Join an existing game using a 6-character short code
 */
export async function joinGameByCode(
  code: string,
  user: {
    uid: string;
    displayName: string;
    photoURL?: string | null;
  }
): Promise<GameDoc | null> {
  const cleanCode = code.trim().toUpperCase();
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('shortCode', '==', cleanCode), limit(1));

  try {
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }

    const docSnap = snap.docs[0];
    const game = docSnap.data() as GameDoc;

    // Check if player is already in this game
    if (game.playerXId === user.uid) {
      return game;
    }
    if (game.playerOId === user.uid) {
      return game;
    }

    // If waiting for Player O, join it
    if (game.status === 'waiting' && !game.playerOId) {
      const updatedData = {
        playerOId: user.uid,
        playerOName: user.displayName || 'Player O',
        playerOPhoto: user.photoURL || null,
        playerOIsAi: false,
        status: 'in_progress' as const,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(docSnap.ref, updatedData);
      return { ...game, ...updatedData };
    }

    // Game already full or completed
    return game;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'games');
  }
}

/**
 * Join an existing game by its full gameId
 */
export async function joinGameById(
  gameId: string,
  user: {
    uid: string;
    displayName: string;
    photoURL?: string | null;
  }
): Promise<GameDoc | null> {
  try {
    const gameRef = doc(db, 'games', gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return null;

    const game = snap.data() as GameDoc;

    if (game.playerXId === user.uid || game.playerOId === user.uid) {
      return game;
    }

    if (game.status === 'waiting' && !game.playerOId) {
      const updatedData = {
        playerOId: user.uid,
        playerOName: user.displayName || 'Player O',
        playerOPhoto: user.photoURL || null,
        playerOIsAi: false,
        status: 'in_progress' as const,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(gameRef, updatedData);
      return { ...game, ...updatedData };
    }

    return game;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `games/${gameId}`);
  }
}

/**
 * Real-time subscription to a single game document
 */
export function subscribeToGame(
  gameId: string,
  onUpdate: (game: GameDoc | null) => void
): () => void {
  const gameRef = doc(db, 'games', gameId);
  return onSnapshot(
    gameRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as GameDoc);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `games/${gameId}`);
    }
  );
}

/**
 * Fetch or listen to user profile in `users/{userId}`
 */
export function subscribeToUserProfile(
  userId: string,
  onUpdate: (profile: UserProfile | null) => void
): () => void {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as UserProfile);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    }
  );
}

/**
 * Ensures user profile doc exists upon sign-in
 */
export async function syncUserProfile(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    const now = new Date().toISOString();

    if (!snap.exists()) {
      const initialProfile: UserProfile = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || 'Player',
        photoURL: user.photoURL || null,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesTied: 0,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(userRef, initialProfile);
      return initialProfile;
    } else {
      const data = snap.data() as UserProfile;
      // Update display name or photo if changed
      if (
        (user.displayName && data.displayName !== user.displayName) ||
        (user.photoURL && data.photoURL !== user.photoURL)
      ) {
        await updateDoc(userRef, {
          displayName: user.displayName || data.displayName,
          photoURL: user.photoURL || data.photoURL,
          updatedAt: now,
        });
      }
      return data;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

/**
 * Increments stats when game ends
 */
export async function recordGameResult(
  userId: string, 
  result: 'won' | 'lost' | 'tied'
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const data = snap.data() as UserProfile;

    const updates: Partial<UserProfile> = {
      gamesPlayed: (data.gamesPlayed || 0) + 1,
      gamesWon: (data.gamesWon || 0) + (result === 'won' ? 1 : 0),
      gamesLost: (data.gamesLost || 0) + (result === 'lost' ? 1 : 0),
      gamesTied: (data.gamesTied || 0) + (result === 'tied' ? 1 : 0),
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(userRef, updates);
  } catch (error) {
    console.error('Failed to record game result:', error);
  }
}
