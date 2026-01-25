import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../AuthModal/AuthModal';

interface UsernameSetupModalProps {
  isOpen: boolean;
  onClose: (wasSubmitted?: boolean) => void;
  score: number;
  elapsedTime: number;
  onScoreSubmitted: () => void;
}

export function UsernameSetupModal({
  isOpen,
  onClose,
  score,
  elapsedTime,
  onScoreSubmitted,
}: UsernameSetupModalProps) {
  const { user, token } = useAuth();
  const [username, setUsername] = useState('');
  const [makePublic, setMakePublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setMakePublic(false);
      setError(null);
      setSubmitted(false);
      setUserRank(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSkip = async () => {
    // Submit score anonymously
    try {
      setIsLoading(true);
      const response = await fetch('/api/game/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score,
          elapsedTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit score');
      }

      const data = await response.json();
      setUserRank(data.rank);
      setSubmitted(true);
      onScoreSubmitted();
      // Close modal after a brief delay to show success
      setTimeout(() => {
        onClose(true); // Pass true to indicate score was submitted
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit score');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !token) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    // Basic client-side validation
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (username.length > 20) {
      setError('Username must be no more than 20 characters long');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError('Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/game/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          score,
          elapsedTime,
          username: username.trim(),
          makePublic,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit score');
      }

      const data = await response.json();
      setUserRank(data.rank);
      setSubmitted(true);
      onScoreSubmitted();
      // Close modal after a brief delay to show success
      setTimeout(() => {
        onClose(true); // Pass true to indicate score was submitted
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit score');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
        onClick={() => onClose(false)}
      >
        <div
          className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-50 to-cyan-50 dark:from-green-600/20 dark:to-cyan-600/20 border-b border-slate-200 dark:border-slate-700/50 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  Game Complete!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Score: {score.toLocaleString()} | Time: {formatTime(elapsedTime)}
                </p>
              </div>
              <button
                onClick={() => onClose(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            {submitted ? (
              <div className="text-center">
                <div className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Score Submitted!
                </div>
                {userRank && (
                  <div className="text-sm text-green-600 dark:text-green-400 mb-4">
                    You are ranked #{userRank}
                  </div>
                )}
                <button
                  onClick={() => onClose(false)}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 text-white rounded-xl font-semibold hover:from-green-500 hover:to-green-400 dark:hover:from-green-400 dark:hover:to-green-300 transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {!user ? (
                  <div className="space-y-4">
                    <p className="text-slate-700 dark:text-slate-300">
                      Sign in to set a public username and appear on the leaderboard, or skip to submit anonymously.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 text-white rounded-xl font-semibold hover:from-green-500 hover:to-green-400 dark:hover:from-green-400 dark:hover:to-green-300 transition-all"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={handleSkip}
                        disabled={isLoading}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                    className="space-y-5"
                  >
                    {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-start gap-3">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Public Username (optional)
                      </label>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setError(null);
                        }}
                        maxLength={20}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 dark:focus:ring-green-500/50 focus:border-green-500/50 dark:focus:border-green-500/50 transition-all"
                        placeholder="Enter username"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        3-20 characters, letters, numbers, underscores, and hyphens only
                      </p>
                    </div>

                    {username.trim() && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={makePublic}
                          onChange={(e) => setMakePublic(e.target.checked)}
                          className="w-4 h-4 text-green-600 dark:text-green-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-green-500/50"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          Make username public on leaderboard
                        </span>
                      </label>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 text-white rounded-xl font-semibold hover:from-green-500 hover:to-green-400 dark:hover:from-green-400 dark:hover:to-green-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
                      >
                        {isLoading ? 'Submitting...' : 'Submit Score'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSkip}
                        disabled={isLoading}
                        className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                      >
                        Skip
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}
