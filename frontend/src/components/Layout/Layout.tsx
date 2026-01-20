import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navigation } from '../Navigation/Navigation';
import { DonationBanner } from '../DonationBanner/DonationBanner';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isGeneratorPage = location.pathname === '/generator';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      {!isGeneratorPage && <DonationBanner />}
      
      {!isGeneratorPage && (
        <header className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg shadow-green-500/20">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-display font-semibold text-slate-900 dark:text-white">Gridfinity Gen (beta)</h1>
                <p className="text-xs text-slate-500 dark:text-slate-500 font-display">Customizable storage solutions</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Navigation />
            </div>
          </div>
        </header>
      )}

      <main className="flex-1">
        {children}
      </main>

      {!isGeneratorPage && (
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-slate-900 dark:text-white font-semibold mb-4">Gridfinity Generator (beta)</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                A fully configurable web-based Gridfinity generator for creating customizable storage bins and baseplates.
              </p>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://github.com/ostat/gridfinity_extended_openscad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    Gridfinity Extended (ostat)
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/new-usemame/Gridfinity_Extended_Generator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    This Project on GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.youtube.com/watch?v=ra_9zU-mnl8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    Gridfinity by Zack Freedman
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-white font-semibold mb-4">License</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                This project is licensed under the GPL-3.0 License.
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                Based on the excellent work of{' '}
                <a
                  href="https://github.com/ostat/gridfinity_extended_openscad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
                >
                  gridfinity_extended_openscad
                </a>{' '}
                by ostat.
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-500">
            <p>&copy; {new Date().getFullYear()} Gridfinity Generator (beta). All rights reserved.</p>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
