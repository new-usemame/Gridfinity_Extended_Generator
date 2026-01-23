import { Leaderboard as LeaderboardComponent } from '../../components/Game2048/Leaderboard';

export function Leaderboard() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Leaderboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Top scores from 2048 games played during model generation
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
          <LeaderboardComponent limit={100} compact={false} />
        </div>
      </div>
    </div>
  );
}
