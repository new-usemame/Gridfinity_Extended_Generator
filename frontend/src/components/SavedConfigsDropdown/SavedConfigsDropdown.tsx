import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BoxConfig, BaseplateConfig } from '../../types/config';
import { compareConfigs } from '../../utils/configComparison';

interface SavedPreference {
  id: number;
  name: string;
  box_config: BoxConfig | null;
  baseplate_config: BaseplateConfig | null;
  created_at: string;
  updated_at: string;
}

interface SavedConfigsDropdownProps {
  onLoadPreference: (boxConfig: BoxConfig | null, baseplateConfig: BaseplateConfig | null) => void;
  currentBoxConfig: BoxConfig;
  currentBaseplateConfig: BaseplateConfig;
}

export interface SavedConfigsDropdownRef {
  refresh: () => void;
  getMatchingConfig: () => SavedPreference | null;
}

export const SavedConfigsDropdown = forwardRef<SavedConfigsDropdownRef, SavedConfigsDropdownProps>(
  ({ onLoadPreference, currentBoxConfig, currentBaseplateConfig }, ref) => {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<SavedPreference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // Expose refresh function and matching config to parent
  useImperativeHandle(ref, () => ({
    refresh: loadPreferences,
    getMatchingConfig: () => {
      return preferences.find(pref => 
        compareConfigs(
          currentBoxConfig,
          currentBaseplateConfig,
          pref.box_config,
          pref.baseplate_config
        )
      ) || null;
    }
  }), [preferences, currentBoxConfig, currentBaseplateConfig]);

  // Refresh preferences when configs change to update matching state
  useEffect(() => {
    // This will cause the component to re-render and show the correct active state
    // We don't need to reload from server, just update the UI
  }, [currentBoxConfig, currentBaseplateConfig]);

  // Load preferences when user is logged in
  useEffect(() => {
    if (user && token) {
      loadPreferences();
    }
  }, [user, token]);

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
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
        setSaveName('');
        setShowSaveDialog(false);
        await loadPreferences();
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
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          title="Saved configurations"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="text-sm font-medium">Saved</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[9999] overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
        >
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
              <div className="p-4 text-center text-slate-400 text-sm">No saved configurations</div>
            ) : (
              <div className="p-2 space-y-1">
                {preferences.map((pref) => {
                  const isActive = compareConfigs(
                    currentBoxConfig,
                    currentBaseplateConfig,
                    pref.box_config,
                    pref.baseplate_config
                  );
                  return (
                    <div
                      key={pref.id}
                      className={`group flex items-center justify-between px-3 py-2 hover:bg-slate-700 rounded-lg transition-colors ${
                        isActive ? 'bg-slate-700/50' : ''
                      }`}
                    >
                      <button
                        onClick={() => handleLoad(pref)}
                        className="flex-1 text-left text-sm text-slate-300 hover:text-white flex items-center gap-2"
                      >
                        {isActive && (
                          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span>{pref.name}</span>
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
        </div>,
        document.body
      )}

      {showSaveDialog && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
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
        </div>,
        document.body
      )}
    </>
  );
});

SavedConfigsDropdown.displayName = 'SavedConfigsDropdown';
