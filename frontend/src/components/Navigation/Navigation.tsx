import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../AuthModal/AuthModal';

export function Navigation() {
  const location = useLocation();
  const { user } = useAuth();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isAboutActive = () => {
    return ['/about', '/features', '/comparison'].includes(location.pathname);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAboutOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown when route changes
  useEffect(() => {
    setIsAboutOpen(false);
  }, [location.pathname]);

  const aboutLinks = [
    { path: '/about', label: 'About' },
    { path: '/features', label: 'Features' },
    { path: '/comparison', label: 'Comparison' },
  ];

  return (
    <nav className="flex items-center gap-2">
      {/* Home */}
      <Link
        to="/"
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive('/')
            ? 'bg-green-600 dark:bg-green-500 text-white shadow-lg shadow-green-500/25'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        Home
      </Link>

      {/* About Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsAboutOpen(!isAboutOpen)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
            isAboutActive()
              ? 'bg-green-600 dark:bg-green-500 text-white shadow-lg shadow-green-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          About
          <svg
            className={`w-4 h-4 transition-transform ${isAboutOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isAboutOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {aboutLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-4 py-2 text-sm transition-colors ${
                  isActive(link.path)
                    ? 'bg-slate-100 dark:bg-slate-700 text-green-600 dark:text-green-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Donate */}
      <Link
        to="/donate"
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive('/donate')
            ? 'bg-green-600 dark:bg-green-500 text-white shadow-lg shadow-green-500/25'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        Donate
      </Link>

      {/* Leaderboard */}
      <Link
        to="/leaderboard"
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive('/leaderboard')
            ? 'bg-green-600 dark:bg-green-500 text-white shadow-lg shadow-green-500/25'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        Leaderboard
      </Link>

      {/* Auth Button or User Indicator */}
      {!user && (
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-all"
        >
          Sign In
        </button>
      )}

      {/* Generator - Bigger button on the right */}
      <Link
        to="/generator"
        className={`px-6 py-2.5 rounded-xl text-base font-semibold transition-all duration-200 ${
          isActive('/generator')
            ? 'bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 text-white shadow-lg shadow-green-500/25'
            : 'bg-gradient-to-r from-green-600/80 to-green-500/80 dark:from-green-500/80 dark:to-green-400/80 text-white hover:from-green-500 hover:to-green-400 dark:hover:from-green-400 dark:hover:to-green-300 shadow-lg shadow-green-500/20 hover:shadow-green-500/40'
        }`}
      >
        Generator
      </Link>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </nav>
  );
}
