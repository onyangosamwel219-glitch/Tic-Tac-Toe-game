import React, { useState } from 'react';
import { Copy, Check, Users, Share2, X, ExternalLink } from 'lucide-react';
import { GameDoc } from '../types/game';
import { sound } from '../lib/sound';

interface ShareModalProps {
  game: GameDoc;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ game, isOpen, onClose }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/?code=${game.shortCode}`;

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      sound.playClick();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl shadow-indigo-950/50 flex flex-col gap-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Invite a Opponent</h3>
            <p className="text-xs text-slate-400">
              Share the short code or link to play against a friend in real time.
            </p>
          </div>
        </div>

        {/* Short Code Box */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex flex-col items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Game Match Code
          </span>
          <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-[0.3em] text-indigo-300 select-all pl-2">
            {game.shortCode}
          </div>

          <button
            onClick={handleCopyCode}
            className="w-full mt-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-indigo-600/25 active:scale-[0.98]"
          >
            {copiedCode ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span className="text-emerald-200">Code Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Short Code</span>
              </>
            )}
          </button>
        </div>

        {/* Share Link Box */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-slate-400" />
              Direct Share Link
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-400 font-mono truncate select-all">
              {shareUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition cursor-pointer shrink-0"
              title="Copy link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Waiting status indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-indigo-300 font-medium py-1">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span>Waiting for your opponent to connect...</span>
        </div>
      </div>
    </div>
  );
};
