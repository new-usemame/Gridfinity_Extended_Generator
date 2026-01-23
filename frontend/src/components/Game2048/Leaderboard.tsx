import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  elapsedTime: number | null;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  limit?: number;
  compact?: boolean;
}

export function Leaderboard({ limit = 10, compact = false }: LeaderboardProps) {
  const { token } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [token, limit]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/game/leaderboard?limit=${limit}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
      setUserRank(data.userRank || null);
    } catch (err) {
      console.error('Leaderboard error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="text-sm text-white/70 dark:text-white/70">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <div className="text-sm text-red-300 dark:text-red-300">{error}</div>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div className={`font-semibold text-white/90 dark:text-white/90 ${compact ? 'text-xs mb-2' : 'text-sm mb-3'}`}>
        Leaderboard
      </div>
      
      {userRank !== null && (
        <div className="mb-2 p-2 bg-green-500/20 dark:bg-green-500/20 border border-green-500/30 dark:border-green-500/30 rounded text-xs">
          <div className="text-green-300 dark:text-green-300 font-medium">
            You are ranked #{userRank}
          </div>
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className={`text-white/60 dark:text-white/60 ${compact ? 'text-xs' : 'text-sm'} py-4 text-center`}>
          No scores yet
        </div>
      ) : (
        <div className={compact ? 'space-y-1 max-h-64 overflow-y-auto' : 'space-y-2'}>
          {leaderboard.map((entry) => (
            <div
              key={`${entry.rank}-${entry.username}-${entry.score}`}
              className={`flex items-center justify-between px-2 py-1 rounded ${
                entry.isCurrentUser
                  ? 'bg-green-500/20 dark:bg-green-500/20 border border-green-500/30'
                  : 'hover:bg-white/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`font-mono ${compact ? 'text-xs w-6' : 'text-sm w-8'} text-green-300 dark:text-green-300 flex-shrink-0`}>
                  #{entry.rank}
                </span>
                <span className={`${compact ? 'text-xs' : 'text-sm'} text-white/90 dark:text-white/90 truncate`}>
                  {entry.username}
                </span>
              </div>
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-white dark:text-white flex-shrink-0 ml-2`}>
                {entry.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
