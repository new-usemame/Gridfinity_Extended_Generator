import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ConfigPanel } from '../../components/ConfigPanel/ConfigPanel';
import { PreviewCanvas } from '../../components/PreviewCanvas/PreviewCanvas';
import { ExportButtons, MultiSegmentExportButtons } from '../../components/ExportButtons/ExportButtons';
import { UserDropdown } from '../../components/UserDropdown/UserDropdown';
import { SavedConfigsDropdown } from '../../components/SavedConfigsDropdown/SavedConfigsDropdown';
import { AuthModal } from '../../components/AuthModal/AuthModal';
import { useAuth } from '../../contexts/AuthContext';
import { BoxConfig, BaseplateConfig, defaultBoxConfig, defaultBaseplateConfig, GenerationResult, MultiSegmentResult, GenerationMode } from '../../types/config';
import { generateBoxScad, generateBaseplateScad, generateCombinedPreviewScad, generateSegmentScad, calculateSplitInfo } from '../../services/scadGenerator';
import { generateLocalStl, revokeLocalStlUrl, isWasmSupported, isWasmLoaded } from '../../services/openscadWasm';

export function Generator() {
  const { user, token } = useAuth();
  const [generationMode, setGenerationMode] = useState<GenerationMode>('server');
  const [isWasmReady, setIsWasmReady] = useState(false);
  const [wasmLoadingStatus, setWasmLoadingStatus] = useState<string | null>(null);
  const hasInitiallyGenerated = useRef(false);
  const [boxConfig, setBoxConfig] = useState<BoxConfig>(defaultBoxConfig);
  const [baseplateConfig, setBaseplateConfig] = useState<BaseplateConfig>(defaultBaseplateConfig);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  
  // Track blob URLs for cleanup
  const blobUrlsRef = useRef<string[]>([]);

  // Sync socket chamfer with foot chamfer when enabled
  const handleBoxConfigChange = useCallback((config: BoxConfig) => {
    setBoxConfig(config);
    if (baseplateConfig.syncSocketWithFoot) {
      setBaseplateConfig({
        ...baseplateConfig,
        socketChamferAngle: config.footChamferAngle,
        socketChamferHeight: config.footChamferHeight,
      });
    }
  }, [baseplateConfig]);

  const handleBaseplateConfigChange = useCallback((config: BaseplateConfig) => {
    setBaseplateConfig(config);
    // If sync is enabled, also update box config to match (for consistency)
    if (config.syncSocketWithFoot) {
      setBoxConfig({
        ...boxConfig,
        footChamferAngle: config.socketChamferAngle,
        footChamferHeight: config.socketChamferHeight,
      });
    }
  }, [boxConfig]);
  const [boxResult, setBoxResult] = useState<GenerationResult | null>(null);
  const [baseplateResult, setBaseplateResult] = useState<GenerationResult | null>(null);
  const [multiSegmentResult, setMultiSegmentResult] = useState<MultiSegmentResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<'box' | 'baseplate'>('box');

  // Cleanup blob URLs on unmount or when generating new ones
  const cleanupBlobUrls = useCallback(() => {
    blobUrlsRef.current.forEach(url => revokeLocalStlUrl(url));
    blobUrlsRef.current = [];
  }, []);

  // Server-side generation
  const handleServerGenerate = useCallback(async () => {
    const [boxResponse, baseplateResponse] = await Promise.all([
      fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'box', config: boxConfig })
      }),
      fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'baseplate', config: baseplateConfig })
      })
    ]);

    if (!boxResponse.ok || !baseplateResponse.ok) {
      const errorData = boxResponse.ok ? await baseplateResponse.json() : await boxResponse.json();
      throw new Error(errorData.message || 'Failed to generate STL');
    }

    const boxResultData: GenerationResult = await boxResponse.json();
    const baseplateResultData = await baseplateResponse.json();
    
    setBoxResult(boxResultData);
    
    if (baseplateResultData.segments) {
      setMultiSegmentResult(baseplateResultData as MultiSegmentResult);
      if (baseplateResultData.segments.length > 0) {
        setBaseplateResult(baseplateResultData.segments[0]);
      }
    } else {
      setBaseplateResult(baseplateResultData as GenerationResult);
    }
  }, [boxConfig, baseplateConfig]);

  // Local (WASM) generation
  const handleLocalGenerate = useCallback(async () => {
    // Clean up previous blob URLs
    cleanupBlobUrls();
    
    if (!isWasmReady) {
      setWasmLoadingStatus('Loading OpenSCAD WASM...');
    }

    // Generate both box and baseplate locally
    const boxScad = generateBoxScad(boxConfig);
    const baseplateScad = generateBaseplateScad(baseplateConfig);
    
    setWasmLoadingStatus('Generating box STL...');
    const boxLocalResult = await generateLocalStl(boxScad, 'box.stl');
    blobUrlsRef.current.push(boxLocalResult.stlUrl);
    setBoxResult({
      stlUrl: boxLocalResult.stlUrl,
      scadContent: boxLocalResult.scadContent,
      filename: boxLocalResult.filename
    });

    // Check if baseplate needs splitting
    if (baseplateConfig.splitEnabled) {
      setWasmLoadingStatus('Generating segmented baseplate...');
      const splitInfo = calculateSplitInfo(baseplateConfig);
      const combinedScad = generateCombinedPreviewScad(baseplateConfig, splitInfo);
      const combinedResult = await generateLocalStl(combinedScad, 'baseplate_preview.stl');
      blobUrlsRef.current.push(combinedResult.stlUrl);

      const segments = [];
      for (let sy = 0; sy < splitInfo.segmentsY; sy++) {
        for (let sx = 0; sx < splitInfo.segmentsX; sx++) {
          const segmentInfo = splitInfo.segments[sy][sx];
          const segmentScad = generateSegmentScad(baseplateConfig, segmentInfo);
          segments.push({
            stlUrl: combinedResult.stlUrl,
            scadContent: segmentScad,
            filename: `baseplate_segment_${sx}_${sy}.stl`,
            segmentX: sx,
            segmentY: sy
          });
        }
      }

      setMultiSegmentResult({ segments, connector: null, splitInfo });
      if (segments.length > 0) {
        setBaseplateResult(segments[0]);
      }
    } else {
      setWasmLoadingStatus('Generating baseplate STL...');
      const baseplateLocalResult = await generateLocalStl(baseplateScad, 'baseplate.stl');
      blobUrlsRef.current.push(baseplateLocalResult.stlUrl);
      setBaseplateResult({
        stlUrl: baseplateLocalResult.stlUrl,
        scadContent: baseplateLocalResult.scadContent,
        filename: baseplateLocalResult.filename
      });
    }

    setIsWasmReady(true);
    setWasmLoadingStatus(null);
  }, [boxConfig, baseplateConfig, isWasmReady, cleanupBlobUrls]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setMultiSegmentResult(null);

    try {
      if (generationMode === 'local') {
        await handleLocalGenerate();
      } else {
        await handleServerGenerate();
      }
    } catch (err) {
      console.error('Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      // If local generation fails, suggest falling back to server
      if (generationMode === 'local') {
        setError(`Local generation failed: ${errorMessage}. Try switching to Server mode.`);
      } else {
        setError(errorMessage || 'An error occurred');
      }
    } finally {
      setIsGenerating(false);
      setWasmLoadingStatus(null);
    }
  }, [generationMode, handleLocalGenerate, handleServerGenerate]);

  // Auto-generate on initial load
  useEffect(() => {
    if (!hasInitiallyGenerated.current) {
      hasInitiallyGenerated.current = true;
      handleGenerate();
    }
  }, [handleGenerate]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      cleanupBlobUrls();
    };
  }, [cleanupBlobUrls]);

  // Handle loading preferences
  const handleLoadPreference = useCallback((boxConfig: BoxConfig | null, baseplateConfig: BaseplateConfig | null) => {
    if (boxConfig) {
      setBoxConfig(boxConfig);
    }
    if (baseplateConfig) {
      setBaseplateConfig(baseplateConfig);
    }
  }, []);

  // Handle save button click
  const handleSaveClick = () => {
    if (!user || !token) {
      setPendingSave(true);
      setIsAuthModalOpen(true);
      return;
    }
    setShowSaveDialog(true);
  };

  // Open save dialog after successful login
  useEffect(() => {
    if (user && token && pendingSave) {
      setPendingSave(false);
      setShowSaveDialog(true);
    }
  }, [user, token, pendingSave]);

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
        // Show success message (you could add a toast notification here)
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

  // Handle downloading configuration
  const handleDownloadConfig = () => {
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

  // Check WASM support
  const wasmSupported = isWasmSupported();

  return (
    <div className="h-screen flex flex-col bg-slate-950 grid-pattern">
      {/* Generator Controls Header */}
      <header className="flex-shrink-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm relative z-50">
        <div className="px-6 py-4 flex items-center justify-between">
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
              <h1 className="text-xl font-display font-semibold text-white">Gridfinity Generator</h1>
              <p className="text-xs text-slate-500 font-display">Customizable storage solutions</p>
            </div>
          </Link>

          {/* Right side: Auth, Save, User Dropdown and Controls */}
          <div className="flex items-center gap-3">
            {/* Auth UI - Leftmost on right side */}
            {!user ? (
              <>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-slate-700 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Sign In
                </button>
                <div className="h-6 w-px bg-slate-700"></div>
              </>
            ) : (
              <>
                <UserDropdown />
                <SavedConfigsDropdown
                  onLoadPreference={handleLoadPreference}
                  currentBoxConfig={boxConfig}
                  currentBaseplateConfig={baseplateConfig}
                />
                <div className="h-6 w-px bg-slate-700"></div>
              </>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveClick}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-slate-700"
              title={user ? 'Save current configuration to your account' : 'Sign in to save configurations'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save
            </button>

            {/* Download Configuration Button */}
            <button
              onClick={handleDownloadConfig}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-slate-700"
              title="Download configuration as JSON file"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Config
            </button>

            {/* Visual Separator */}
            <div className="h-6 w-px bg-slate-700"></div>

            {/* Generation Mode Toggle */}
            <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5">
              <button
                onClick={() => setGenerationMode('server')}
                disabled={isGenerating}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  generationMode === 'server'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Generate on server (faster, requires connection)"
              >
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                  Server
                </span>
              </button>
              <button
                onClick={() => setGenerationMode('local')}
                disabled={isGenerating || !wasmSupported}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  generationMode === 'local'
                    ? 'bg-cyan-600 text-white'
                    : wasmSupported 
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 cursor-not-allowed'
                }`}
                title={wasmSupported 
                  ? "Generate locally in browser (no server needed, slower first time)"
                  : "WebAssembly not supported in this browser"
                }
              >
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Local
                  {isWasmLoaded() && <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-1"></span>}
                </span>
              </button>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isGenerating
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : generationMode === 'local'
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
                    : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400 shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {wasmLoadingStatus || 'Generating...'}
                </span>
              ) : (
                `Generate STL`
              )}
            </button>
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingSave(false);
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
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">Save Configuration</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Configuration name"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white mb-4 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
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
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveName('');
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all"
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
        <aside className="w-96 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 h-full flex flex-col">
          {/* Tab Selector */}
          <div className="flex-shrink-0 flex border-b border-slate-800">
            <button
              onClick={() => setActiveEditor('box')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeEditor === 'box'
                  ? 'bg-slate-800 text-green-400 border-b-2 border-green-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Box Editor
            </button>
            <button
              onClick={() => setActiveEditor('baseplate')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeEditor === 'baseplate'
                  ? 'bg-slate-800 text-green-400 border-b-2 border-green-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Baseplate Editor
            </button>
          </div>
          {/* Active Editor Panel - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <ConfigPanel
              type={activeEditor}
              boxConfig={boxConfig}
              baseplateConfig={baseplateConfig}
              onBoxConfigChange={handleBoxConfigChange}
              onBaseplateConfigChange={handleBaseplateConfigChange}
            />
          </div>
        </aside>

        {/* Preview Area */}
        <main className="flex-1 flex flex-col min-h-0 pb-56">
          {/* Error Message */}
          {error && (
            <div className="m-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
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
            <PreviewCanvas
              boxStlUrl={boxResult?.stlUrl || null}
              baseplateStlUrl={baseplateResult?.stlUrl || null}
              isLoading={isGenerating}
              isCombinedView={true}
              boxConfig={boxConfig}
              baseplateConfig={baseplateConfig}
            />
          </div>
        </main>
      </div>

      {/* Export Buttons - Fixed to bottom of screen (only over preview area) */}
      <div className="fixed bottom-0 left-96 right-0 border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm p-4 space-y-4 overflow-x-auto min-w-0 z-10">
        {boxResult && (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 mb-2">BOX</h4>
            <ExportButtons
              stlUrl={boxResult.stlUrl}
              scadContent={boxResult.scadContent}
              filename={boxResult.filename}
            />
          </div>
        )}
        {multiSegmentResult ? (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 mb-2">BASEPLATE (SPLIT)</h4>
            <MultiSegmentExportButtons
              result={multiSegmentResult}
              splitInfo={multiSegmentResult.splitInfo}
              baseplateConfig={baseplateConfig}
              generationMode={generationMode}
            />
          </div>
        ) : baseplateResult && (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 mb-2">BASEPLATE</h4>
            <ExportButtons
              stlUrl={baseplateResult.stlUrl}
              scadContent={baseplateResult.scadContent}
              filename={baseplateResult.filename}
            />
          </div>
        )}
      </div>
    </div>
  );
}
