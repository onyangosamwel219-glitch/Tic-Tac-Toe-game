import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser } from './lib/firebase';
import { 
  createNewGame, 
  joinGameByCode, 
  joinGameById, 
  syncUserProfile, 
  subscribeToUserProfile 
} from './lib/gameService';
import { sound } from './lib/sound';
import { GameDoc, GameMode, AiDifficulty, UserProfile } from './types/game';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { GameView } from './components/GameView';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<GameDoc | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');

  // 1. Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (user) {
        try {
          const synced = await syncUserProfile({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          });
          setProfile(synced);
        } catch (err) {
          console.error('Failed to sync user profile:', err);
        }
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time profile updates when logged in
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToUserProfile(currentUser.uid, (p) => {
      if (p) setProfile(p);
    });
    return () => unsub();
  }, [currentUser]);

  // 3. Check URL parameters for match join invitations (?game=... or ?code=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    const gameParam = params.get('game');

    if (codeParam) {
      setInitialJoinCode(codeParam.toUpperCase());
    }

    // Auto-join if user is already signed in
    if (currentUser) {
      if (codeParam) {
        joinGameByCode(codeParam, {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Player O',
          photoURL: currentUser.photoURL,
        }).then((joined) => {
          if (joined) {
            setActiveGame(joined);
          }
        }).catch(console.error);
      } else if (gameParam) {
        joinGameById(gameParam, {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Player O',
          photoURL: currentUser.photoURL,
        }).then((joined) => {
          if (joined) {
            setActiveGame(joined);
          }
        }).catch(console.error);
      }
    }
  }, [currentUser]);

  // Audio Toggle
  const handleToggleAudio = () => {
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    sound.enabled = next;
  };

  const handleLogin = async () => {
    try {
      sound.playClick();
      const user = await loginWithGoogle();
      setCurrentUser(user);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      sound.playClick();
      await logoutUser();
      setActiveGame(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleCreateGame = async (mode: GameMode, difficulty?: AiDifficulty) => {
    if (!currentUser) {
      await handleLogin();
      return;
    }

    const newGame = await createNewGame({
      mode,
      aiDifficulty: difficulty,
      user: {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Player X',
        photoURL: currentUser.photoURL,
      },
    });

    if (newGame) {
      setActiveGame(newGame);
      // Clean query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleJoinByCode = async (code: string) => {
    if (!currentUser) {
      await handleLogin();
      return;
    }

    const joined = await joinGameByCode(code, {
      uid: currentUser.uid,
      displayName: currentUser.displayName || 'Player O',
      photoURL: currentUser.photoURL,
    });

    if (joined) {
      setActiveGame(joined);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      throw new Error(`Match with code "${code}" not found or full.`);
    }
  };

  const handleExitGame = () => {
    sound.playClick();
    setActiveGame(null);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs font-mono tracking-wider">Connecting to Firebase...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar
        user={currentUser}
        profile={profile}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onGoHome={handleExitGame}
        isAudioEnabled={isAudioEnabled}
        onToggleAudio={handleToggleAudio}
      />

      <main className="flex-1 flex flex-col">
        {activeGame && currentUser ? (
          <GameView
            initialGame={activeGame}
            currentUser={currentUser}
            onExit={handleExitGame}
            onRestartAiMatch={async (difficulty) => {
              await handleCreateGame('ai', (difficulty as AiDifficulty) || 'hard');
            }}
          />
        ) : (
          <Lobby
            user={currentUser}
            profile={profile}
            onLogin={handleLogin}
            onCreateGame={handleCreateGame}
            onJoinByCode={handleJoinByCode}
            initialCode={initialJoinCode}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 px-4 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Chronos Tic-Tac-Toe • Event-Sourced Architecture with Google Sign-In & Minimax AI
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Zero LLM Inference • 100% Mathematical Minimax
          </span>
        </div>
      </footer>
    </div>
  );
}
