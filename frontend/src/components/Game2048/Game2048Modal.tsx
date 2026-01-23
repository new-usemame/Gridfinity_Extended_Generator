import { useState, useEffect, useRef } from 'react';
import { Game2048 } from './Game2048';
import { Leaderboard } from './Leaderboard';
import { UsernameSetupModal } from './UsernameSetupModal';

interface Game2048ModalProps {
  isOpen: boolean;
  isGenerating: boolean;
  onClose?: () => void;
}

export function Game2048Modal({ isOpen, isGenerating, onClose }: Game2048ModalProps) {
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [gameElapsedTime, setGameElapsedTime] = useState(0);
  const [hasCompletedFirstGame, setHasCompletedFirstGame] = useState(() => {
    return localStorage.getItem('gridfinity_2048_has_completed_first_game') === 'true';
  });
  const [usernamePromptDismissed, setUsernamePromptDismissed] = useState(() => {
    return localStorage.getItem('gridfinity_2048_username_prompt_dismissed') === 'true';
  });
  const [canClose, setCanClose] = useState(false);
  const pendingGameOverRef = useRef<{ score: number; elapsedTime: number } | null>(null);

  useEffect(() => {
    // When generation completes, check if we can close
    if (!isGenerating && canClose && !showUsernameModal) {
      // Allow closing if generation is done and no modal is showing
      if (onClose) {
        onClose();
      }
    }
  }, [isGenerating, canClose, showUsernameModal, onClose]);

  useEffect(() => {
    // Reset canClose when generation starts
    if (isGenerating) {
      setCanClose(false);
    }
  }, [isGenerating]);

  const handleGameOver = (score: number, elapsedTime: number) => {
    setGameScore(score);
    setGameElapsedTime(elapsedTime);
    
    // Check if this is the first game
    if (!hasCompletedFirstGame && !usernamePromptDismissed) {
      setShowUsernameModal(true);
      setHasCompletedFirstGame(true);
      localStorage.setItem('gridfinity_2048_has_completed_first_game', 'true');
    } else {
      // Not first game, can close when generation completes
      pendingGameOverRef.current = { score, elapsedTime };
    }
  };

  const handleUsernameModalClose = () => {
    setShowUsernameModal(false);
    setUsernamePromptDismissed(true);
    localStorage.setItem('gridfinity_2048_username_prompt_dismissed', 'true');
    
    // After username modal closes, allow closing when generation completes
    if (!isGenerating) {
      setCanClose(true);
    }
  };

  const handleScoreSubmitted = () => {
    // Score submitted, can close when generation completes
    if (!isGenerating) {
      setCanClose(true);
    }
  };

  const handleModalClose = () => {
    // Only allow closing if generation is complete and no modals are showing
    if (!isGenerating && !showUsernameModal && canClose) {
      if (onClose) {
        onClose();
      }
    } else if (showUsernameModal) {
      // If username modal is showing, just close it
      handleUsernameModalClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
        onClick={handleModalClose}
      >
        <div
          className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-3xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Simple Header */}
          <div className="border-b border-slate-200 dark:border-slate-700/50 px-4 py-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Play 2048
            </h2>
            {(!isGenerating && canClose && !showUsernameModal) && (
              <button
                onClick={handleModalClose}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Game */}
              <div className="flex-1 min-w-0">
                <Game2048
                  isVisible={isOpen}
                  isPlayable={!showUsernameModal}
                  onGameOver={handleGameOver}
                />
              </div>

              {/* Leaderboard */}
              <div className="w-full sm:w-64 flex-shrink-0">
                <Leaderboard limit={10} compact={true} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Username Setup Modal */}
      {showUsernameModal && (
        <UsernameSetupModal
          isOpen={showUsernameModal}
          onClose={handleUsernameModalClose}
          score={gameScore}
          elapsedTime={gameElapsedTime}
          onScoreSubmitted={handleScoreSubmitted}
        />
      )}
    </>
  );
}
