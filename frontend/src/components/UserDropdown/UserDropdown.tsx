import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BoxConfig, BaseplateConfig } from '../../types/config';

interface SavedPreference {
  id: number;
  name: string;
  box_config: BoxConfig | null;
  baseplate_config: BaseplateConfig | null;
  created_at: string;
  updated_at: string;
}

interface UserDropdownProps {
  onLoadPreference: (boxConfig: BoxConfig | null, baseplateConfig: BaseplateConfig | null) => void;
  currentBoxConfig: BoxConfig;
  currentBaseplateConfig: BaseplateConfig;
}

export function UserDropdown({ onLoadPreference, currentBoxConfig, currentBaseplateConfig }: UserDropdownProps) {
  const { user, token, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<SavedPreference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load preferences when user is logged in
  useEffect(() => {
    if (user && token) {
      loadPreferences();
    }
  }, [user, token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences || []);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!saveName.trim() || !token) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: saveName.trim(),
          boxConfig: currentBoxConfig,
          baseplateConfig: currentBaseplateConfig,
        }),
      });

      if (response.ok) {
        await loadPreferences();
        setSaveName('');
        setShowSaveDialog(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save preference');
      }
    } catch (error) {
      console.error('Failed to save preference:', error);
      alert('Failed to save preference');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = (pref: SavedPreference) => {
    onLoadPreference(pref.box_config, pref.baseplate_config);
    setIsOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (!token || !confirm('Are you sure you want to delete this preference?')) return;

    try {
      const response = await fetch(`/api/preferences/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadPreferences();
      } else {
        alert('Failed to delete preference');
      }
    } catch (error) {
      console.error('Failed to delete preference:', error);
      alert('Failed to delete preference');
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-sm font-medium">{user.email}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Signed in as</div>
            <div className="text-white font-medium">{user.email}</div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <div className="p-2">
              <button
                onClick={() => {
                  setShowSaveDialog(true);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Save Current Configuration
              </button>
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-slate-400 text-sm">Loading...</div>
            ) : preferences.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">No saved preferences</div>
            ) : (
              <div className="p-2 space-y-1">
                {preferences.map((pref) => (
                  <div
                    key={pref.id}
                    className="group flex items-center justify-between px-3 py-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <button
                      onClick={() => handleLoad(pref)}
                      className="flex-1 text-left text-sm text-slate-300 hover:text-white"
                    >
                      {pref.name}
                    </button>
                    <button
                      onClick={() => handleDelete(pref.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-slate-700">
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setShowSaveDialog(false);
            setSaveName('');
          }}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">Save Configuration</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Configuration name"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                } else if (e.key === 'Escape') {
                  setShowSaveDialog(false);
                  setSaveName('');
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!saveName.trim() || isSaving}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveName('');
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
