import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ConfigPanel } from '../../components/ConfigPanel/ConfigPanel';
import { PreviewCanvas } from '../../components/PreviewCanvas/PreviewCanvas';
import { UserDropdown } from '../../components/UserDropdown/UserDropdown';
import { SavedConfigsDropdown } from '../../components/SavedConfigsDropdown/SavedConfigsDropdown';
import type { SavedConfigsDropdownRef } from '../../components/SavedConfigsDropdown/SavedConfigsDropdown';
import { AuthModal } from '../../components/AuthModal/AuthModal';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import { Game2048 } from '../../components/Game2048/Game2048';
import { Leaderboard } from '../../components/Game2048/Leaderboard';
import { useAuth } from '../../contexts/AuthContext';
import { BoxConfig, BaseplateConfig, defaultBoxConfig, defaultBaseplateConfig, GenerationResult, MultiSegmentResult, normalizeBoxConfig, normalizeBaseplateConfig } from '../../types/config';

export function Generator() {
  const { user, token } = useAuth();
  const hasInitiallyGenerated = useRef(false);
  const [boxConfig, setBoxConfig] = useState<BoxConfig>(defaultBoxConfig);
  const [baseplateConfig, setBaseplateConfig] = useState<BaseplateConfig>(defaultBaseplateConfig);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [pendingSaveAfterAuth, setPendingSaveAfterAuth] = useState(false);
  const savedConfigsDropdownRef = useRef<SavedConfigsDropdownRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'easy' | 'pro' | 'expert'>('pro');

  // Enforce hardcoded values when in Easy/Pro mode
  useEffect(() => {
    if (mode === 'easy' || mode === 'pro') {
      setBoxConfig(prev => ({
        ...prev,
        preventBottomOverhangs: true,
        flatBase: 'off',
      }));
      setBaseplateConfig(prev => ({
        ...prev,
        cornerSegments: 32,
        syncSocketWithFoot: true,
      }));
      // In Pro mode, also enforce sizingMode for baseplate
      if (mode === 'pro') {
        setBaseplateConfig(prev => ({
          ...prev,
          sizingMode: 'fill_area_mm',
        }));
      }
    }
  }, [mode]);

  // Sync socket chamfer with foot chamfer when enabled
  // Always sync bottom corner radius between foot and socket
  // Bidirectional sync between lip and foot chamfer controls
  const handleBoxConfigChange = useCallback((config: BoxConfig) => {
    setBoxConfig(prevConfig => {
      // Detect which property changed and sync accordingly
      const updates: Partial<BoxConfig> = { ...config };
      
      // Bidirectional sync: if lip chamfer changed, update foot chamfer
      if (config.lipChamferAngle !== prevConfig.lipChamferAngle) {
        updates.footChamferAngle = config.lipChamferAngle;
      }
      if (config.lipChamferHeight !== prevConfig.lipChamferHeight) {
        updates.footChamferHeight = config.lipChamferHeight;
      }
      
      // Bidirectional sync: if foot chamfer changed, update lip chamfer
      if (config.footChamferAngle !== prevConfig.footChamferAngle) {
        updates.lipChamferAngle = config.footChamferAngle;
      }
      if (config.footChamferHeight !== prevConfig.footChamferHeight) {
        updates.lipChamferHeight = config.footChamferHeight;
      }
      
      return { ...prevConfig, ...updates };
    });
    
    setBaseplateConfig(prev => {
      const updates: Partial<BaseplateConfig> = {
        socketBottomCornerRadius: config.footBottomCornerRadius,
      };
      // Sync socket chamfer with foot chamfer when enabled
      if (prev.syncSocketWithFoot) {
        updates.socketChamferAngle = config.footChamferAngle;
        updates.socketChamferHeight = config.footChamferHeight;
      }
      return { ...prev, ...updates };
    });
  }, []);

  const handleBaseplateConfigChange = useCallback((config: BaseplateConfig) => {
    setBaseplateConfig(config);
    setBoxConfig(prev => {
      const updates: Partial<BoxConfig> = {
        footBottomCornerRadius: config.socketBottomCornerRadius,
      };
      // If sync is enabled, also update box config to match (for consistency)
      if (config.syncSocketWithFoot) {
        updates.footChamferAngle = config.socketChamferAngle;
        updates.footChamferHeight = config.socketChamferHeight;
      }
      return { ...prev, ...updates };
    });
  }, []);
  const [boxResult, setBoxResult] = useState<GenerationResult | null>(null);
  const [baseplateResult, setBaseplateResult] = useState<GenerationResult | null>(null);
  const [multiSegmentResult, setMultiSegmentResult] = useState<MultiSegmentResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<'box' | 'baseplate'>('box');
  const [generateBox, setGenerateBox] = useState(true);
  const [generateBaseplate, setGenerateBaseplate] = useState(true);
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);

  // Server-side generation
  const handleServerGenerate = useCallback(async () => {
    const promises: Promise<Response>[] = [];
    const types: string[] = [];

    if (generateBox) {
      promises.push(
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'box', config: boxConfig })
        })
      );
      types.push('box');
    }

    if (generateBaseplate) {
      promises.push(
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'baseplate', config: baseplateConfig })
        })
      );
      types.push('baseplate');
    }

    // If nothing is selected, don't generate anything
    if (promises.length === 0) {
      return;
    }

    const responses = await Promise.all(promises);

    // Check for errors
    const errors: string[] = [];
    responses.forEach((response, index) => {
      if (!response.ok) {
        errors.push(types[index]);
      }
    });

    if (errors.length > 0) {
      throw new Error(`Failed to generate STL for: ${errors.join(', ')}`);
    }

    // Process responses
    let responseIndex = 0;
    if (generateBox) {
      const boxResultData: GenerationResult = await responses[responseIndex].json();
      setBoxResult(boxResultData);
      responseIndex++;
    } else {
      // If box is not being generated, keep existing result (don't clear it)
      // This allows hiding/showing without regenerating
    }

    if (generateBaseplate) {
      const baseplateResultData = await responses[responseIndex].json();
      if (baseplateResultData.segments) {
        setMultiSegmentResult(baseplateResultData as MultiSegmentResult);
        if (baseplateResultData.segments.length > 0) {
          setBaseplateResult(baseplateResultData.segments[0]);
        }
      } else {
        setBaseplateResult(baseplateResultData as GenerationResult);
      }
    } else {
      // If baseplate is not being generated, keep existing result (don't clear it)
      // This allows hiding/showing without regenerating
    }
  }, [boxConfig, baseplateConfig, generateBox, generateBaseplate]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    // Only clear results if we're actually generating them
    // This allows hiding/showing without regenerating
    if (generateBox && generateBaseplate) {
      setMultiSegmentResult(null);
    } else if (generateBox) {
      // Only generating box, keep baseplate results
    } else if (generateBaseplate) {
      // Only generating baseplate, keep box result
      setMultiSegmentResult(null);
    } else {
      // Nothing selected, don't clear anything
    }

    try {
      await handleServerGenerate();
    } catch (err) {
      console.error('Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  }, [handleServerGenerate, generateBox, generateBaseplate]);

  // Auto-generate on initial load
  useEffect(() => {
    if (!hasInitiallyGenerated.current) {
      hasInitiallyGenerated.current = true;
      handleGenerate();
    }
  }, [handleGenerate]);

  // Handle loading preferences
  const handleLoadPreference = useCallback((boxConfig: BoxConfig | null, baseplateConfig: BaseplateConfig | null) => {
    if (boxConfig) {
      // Normalize to ensure backwards compatibility with old configs
      setBoxConfig(normalizeBoxConfig(boxConfig));
    }
    if (baseplateConfig) {
      // Normalize to ensure backwards compatibility with old configs
      setBaseplateConfig(normalizeBaseplateConfig(baseplateConfig));
    }
  }, []);


  // Open save dialog after successful login
  useEffect(() => {
    if (user && token && pendingSave) {
      setPendingSave(false);
      setShowSaveDialog(true);
    }
  }, [user, token, pendingSave]);

  // Open save dialog after successful login when triggered from download
  useEffect(() => {
    if (user && token && pendingSaveAfterAuth) {
      setPendingSaveAfterAuth(false);
      setShowSaveDialog(true);
    }
  }, [user, token, pendingSaveAfterAuth]);

  // Handle saving preference
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
          boxConfig: boxConfig,
          baseplateConfig: baseplateConfig,
        }),
      });

      if (response.ok) {
        setSaveName('');
        setShowSaveDialog(false);
        // Reload preferences to update the matching state
        await loadSavedPreferences();
        // Refresh the saved configs dropdown to show the new/updated config
        if (savedConfigsDropdownRef.current) {
          savedConfigsDropdownRef.current.refresh();
        }
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

  // Load saved preferences to refresh dropdown
  const loadSavedPreferences = async () => {
    if (!token) return;
    try {
      await fetch('/api/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      // Preferences are loaded by SavedConfigsDropdown component
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  // Refresh preferences when user logs in
  useEffect(() => {
    if (user && token) {
      loadSavedPreferences();
    }
  }, [user, token]);


  // Handle downloading configuration
  const handleDownloadJSON = () => {
    const config = {
      boxConfig,
      baseplateConfig,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gridfinity-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Detect file type from file
  const detectFileType = (file: File): string => {
    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension) {
      return extension;
    }
    // Check MIME type
    if (file.type) {
      return file.type;
    }
    return 'unknown';
  };

  // Handle loading configuration from file
  const handleLoadConfig = () => {
    fileInputRef.current?.click();
  };

  // Handle click outside download dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
        setIsDownloadDropdownOpen(false);
      }
    };

    if (isDownloadDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDownloadDropdownOpen]);

  // Download handlers
  const handleDownloadBox = () => {
    if (!boxResult) return;
    const link = document.createElement('a');
    link.href = boxResult.stlUrl;
    link.download = boxResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDownloadDropdownOpen(false);
  };

  const handleDownloadBaseplate = () => {
    if (!baseplateResult && !multiSegmentResult) return;
    
    if (multiSegmentResult) {
      // Handle multi-segment download
      const downloadAllSequentially = async () => {
        try {
          const response = await fetch('/api/generate/segments-zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config: baseplateConfig
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to generate zip file');
          }
          
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `baseplate_segments_${Date.now()}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('Failed to download zip:', err);
          // Fallback to single segment if available
          if (baseplateResult) {
            const link = document.createElement('a');
            link.href = baseplateResult.stlUrl;
            link.download = baseplateResult.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      };
      downloadAllSequentially();
    } else if (baseplateResult) {
      // Handle single baseplate download
      const link = document.createElement('a');
      link.href = baseplateResult.stlUrl;
      link.download = baseplateResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsDownloadDropdownOpen(false);
  };

  // Handle file input change
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = '';

    // Detect file type
    const fileType = detectFileType(file);
    const isJson = fileType === 'json' || 
                   fileType === 'application/json' || 
                   fileType === 'text/json' ||
                   file.name.toLowerCase().endsWith('.json');

    if (!isJson) {
      // Show file type in error message
      const typeName = fileType === 'unknown' ? 'unknown type' : fileType.toUpperCase();
      alert(`This file is a ${typeName}, not JSON`);
      return;
    }

    // Read file
    try {
      const text = await file.text();
      const config = JSON.parse(text);

      // Validate config structure
      if (!config || typeof config !== 'object') {
        alert('Invalid JSON file: root must be an object');
        return;
      }

      // Validate and load boxConfig
      if (config.boxConfig) {
        if (typeof config.boxConfig !== 'object') {
          alert('Invalid JSON file: boxConfig must be an object');
          return;
        }
        // Normalize to ensure backwards compatibility with old configs
        setBoxConfig(normalizeBoxConfig(config.boxConfig));
      } else {
        alert('Invalid JSON file: missing boxConfig');
        return;
      }

      // Validate and load baseplateConfig
      if (config.baseplateConfig) {
        if (typeof config.baseplateConfig !== 'object') {
          alert('Invalid JSON file: baseplateConfig must be an object');
          return;
        }
        // Normalize to ensure backwards compatibility with old configs
        setBaseplateConfig(normalizeBaseplateConfig(config.baseplateConfig));
      } else {
        alert('Invalid JSON file: missing baseplateConfig');
        return;
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        alert('Invalid JSON file: could not parse JSON');
      } else {
        alert(`Error loading file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };


  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-slate-950 grid-pattern">
      {/* Generator Controls Header */}
      <header className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm relative z-50">
        <div className="px-4 py-3 flex items-center gap-2">
          {/* Left side: Title/Logo */}
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

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Theme button */}
          <ThemeToggle />

          {/* Easy, Pro, Expert buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setMode('easy')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                mode === 'easy'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Easy
            </button>
            <button
              onClick={() => setMode('pro')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                mode === 'pro'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pro
            </button>
            <button
              onClick={() => setMode('expert')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                mode === 'expert'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Expert
            </button>
          </div>

          {/* Save dropdown (with JSON buttons at top) */}
          {user ? (
            <SavedConfigsDropdown
              ref={savedConfigsDropdownRef}
              onLoadPreference={handleLoadPreference}
              currentBoxConfig={boxConfig}
              currentBaseplateConfig={baseplateConfig}
              onSaveJSON={handleDownloadJSON}
              onLoadJSON={handleLoadConfig}
            />
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-slate-300 dark:border-slate-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="text-sm font-medium">Save</span>
            </button>
          )}

          {/* User button dropdown */}
          {user ? (
            <UserDropdown />
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center justify-center w-9 h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-300 rounded-lg transition-colors"
              title="Sign in"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          )}

          {/* Divider */}
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700"></div>

          {/* Box, Baseplate checkboxes */}
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generateBox}
                onChange={(e) => setGenerateBox(e.target.checked)}
                className="w-4 h-4 text-green-600 dark:text-green-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-green-500/50 dark:focus:ring-green-500/50"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Box</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generateBaseplate}
                onChange={(e) => setGenerateBaseplate(e.target.checked)}
                className="w-4 h-4 text-green-600 dark:text-green-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-green-500/50 dark:focus:ring-green-500/50"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Baseplate</span>
            </label>
          </div>

          {/* Generate STL button */}
          <div className="relative flex" ref={downloadDropdownRef}>
            {/* Main Generate STL Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!generateBox && !generateBaseplate)}
              className={`px-6 py-2.5 rounded-l-xl font-medium text-sm transition-all duration-200 ${
                isGenerating || (!generateBox && !generateBaseplate)
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 text-white hover:from-green-500 hover:to-green-400 dark:hover:from-green-400 dark:hover:to-green-300 shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                <span className="flex flex-col items-center leading-tight">
                  <span>Generate</span>
                  <span className="text-xs">STL</span>
                </span>
              )}
            </button>
            
            {/* Dropdown Arrow Button */}
            <button
              onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
              disabled={isGenerating || (!generateBox && !generateBaseplate) || (!boxResult && !baseplateResult && !multiSegmentResult)}
              className={`px-2 py-2.5 rounded-r-xl border-l border-white/20 dark:border-white/10 font-medium text-sm transition-all duration-200 ${
                isGenerating || (!generateBox && !generateBaseplate) || (!boxResult && !baseplateResult && !multiSegmentResult)
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 text-white hover:from-green-500 hover:to-green-400 dark:hover:from-green-400 dark:hover:to-green-300 shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDownloadDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                {generateBox && boxResult && (
                  <button
                    onClick={handleDownloadBox}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Box
                  </button>
                )}
                {generateBaseplate && (baseplateResult || multiSegmentResult) && (
                  <button
                    onClick={handleDownloadBaseplate}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Baseplate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hidden file input for JSON loading */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingSave(false);
          // If user just signed in and we have pending save after auth, it will be handled by useEffect
        }} 
      />


      {/* Save Dialog */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={() => {
            setShowSaveDialog(false);
            setSaveName('');
          }}
        >
          <div
            className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Save Configuration</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Configuration name"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white mb-4 focus:outline-none focus:ring-2 focus:ring-green-500/50 dark:focus:ring-green-500/50 focus:border-green-500/50 dark:focus:border-green-500/50"
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
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 hover:from-green-500 hover:to-green-400 dark:hover:from-green-400 dark:hover:to-green-300 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveName('');
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Config Panel - Sidebar with independent scroll */}
        <aside className="w-96 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 h-full flex flex-col">
          {/* Tab Selector (Expert mode only) */}
          {mode === 'expert' && (
            <div className="flex-shrink-0 flex border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveEditor('box')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeEditor === 'box'
                    ? 'bg-slate-100 dark:bg-slate-800 text-green-600 dark:text-green-400 border-b-2 border-green-500 dark:border-green-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                }`}
              >
                Box Editor
              </button>
              <button
                onClick={() => setActiveEditor('baseplate')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeEditor === 'baseplate'
                    ? 'bg-slate-100 dark:bg-slate-800 text-green-600 dark:text-green-400 border-b-2 border-green-500 dark:border-green-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                }`}
              >
                Baseplate Editor
              </button>
            </div>
          )}
          {/* Active Editor Panel - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <ConfigPanel
              type={mode === 'expert' ? activeEditor : 'combined'}
              mode={mode}
              boxConfig={boxConfig}
              baseplateConfig={baseplateConfig}
              onBoxConfigChange={handleBoxConfigChange}
              onBaseplateConfigChange={handleBaseplateConfigChange}
            />
          </div>
        </aside>

        {/* Preview Area */}
        <main className="flex-1 flex flex-col min-h-0">
          {/* Error Message */}
          {error && (
            <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* 3D Preview */}
          <div className="flex-1 relative min-h-0">
            {isGenerating ? (
              /* 2048 Game - shown during generation */
              <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-8 overflow-y-auto">
                <div className="w-full max-w-4xl">
                  {/* Loading Indicator */}
                  <div className="mb-6 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-green-500/30 dark:border-green-500/30 border-t-green-500 dark:border-t-green-500 rounded-full animate-spin mb-3" />
                    <div className="text-center">
                      <div className="text-lg font-semibold text-slate-900 dark:text-white">Loading</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Please enjoy this game of 2048!</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Game */}
                    <div className="flex-1 min-w-0">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Play 2048 While Generating</h3>
                        <Game2048
                          isVisible={isGenerating}
                          isPlayable={isGenerating}
                        />
                      </div>
                    </div>
                    {/* Leaderboard */}
                    <div className="w-full sm:w-64 flex-shrink-0">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg">
                        <Leaderboard limit={10} compact={true} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <PreviewCanvas
                boxStlUrl={generateBox ? (boxResult?.stlUrl || null) : null}
                baseplateStlUrl={generateBaseplate ? (baseplateResult?.stlUrl || null) : null}
                isLoading={isGenerating}
                isCombinedView={true}
                boxConfig={boxConfig}
                baseplateConfig={baseplateConfig}
              />
            )}
          </div>
        </main>
      </div>

    </div>
  );
}
