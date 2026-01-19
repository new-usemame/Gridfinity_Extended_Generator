import { Link, useLocation } from 'react-router-dom';

export function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/generator', label: 'Generator' },
    { path: '/features', label: 'Features' },
    { path: '/comparison', label: 'Comparison' },
    { path: '/about', label: 'About' },
    { path: '/donate', label: 'Donate' },
  ];

  return (
    <nav className="flex items-center gap-1">
      {navLinks.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive(link.path)
              ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
