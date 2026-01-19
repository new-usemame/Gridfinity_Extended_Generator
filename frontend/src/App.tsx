import { useState, useCallback, useEffect, useRef } from 'react';
import { ConfigPanel } from './components/ConfigPanel/ConfigPanel';
import { PreviewCanvas } from './components/PreviewCanvas/PreviewCanvas';
import { ExportButtons, MultiSegmentExportButtons } from './components/ExportButtons/ExportButtons';
import { BoxConfig, BaseplateConfig, defaultBoxConfig, defaultBaseplateConfig, GenerationResult, MultiSegmentResult, GenerationMode } from './types/config';
import { generateBoxScad, generateBaseplateScad, generateCombinedPreviewScad, generateSegmentScad, calculateSplitInfo } from './services/scadGenerator';
import { generateLocalStl, revokeLocalStlUrl, isWasmSupported, isWasmLoaded } from './services/openscadWasm';

type GeneratorType = 'box' | 'baseplate' | 'combined';

function App() {
  const [generatorType, setGeneratorType] = useState<GeneratorType>('combined');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('server');
  const [isWasmReady, setIsWasmReady] = useState(false);
  const [wasmLoadingStatus, setWasmLoadingStatus] = useState<string | null>(null);
  const hasInitiallyGenerated = useRef(false);
  const [boxConfig, setBoxConfig] = useState<BoxConfig>(defaultBoxConfig);
  const [baseplateConfig, setBaseplateConfig] = useState<BaseplateConfig>(defaultBaseplateConfig);
  
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
    if (generatorType === 'combined') {
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
    } else {
      const config = generatorType === 'box' ? boxConfig : baseplateConfig;
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: generatorType, config })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate STL');
      }

      const resultData = await response.json();
      
      if (generatorType === 'box') {
        setBoxResult(resultData as GenerationResult);
      } else {
        if (resultData.segments) {
          setMultiSegmentResult(resultData as MultiSegmentResult);
          if (resultData.segments.length > 0) {
            setBaseplateResult(resultData.segments[0]);
          }
        } else {
          setBaseplateResult(resultData as GenerationResult);
        }
      }
    }
  }, [generatorType, boxConfig, baseplateConfig]);

  // Local (WASM) generation
  const handleLocalGenerate = useCallback(async () => {
    // Clean up previous blob URLs
    cleanupBlobUrls();
    
    if (!isWasmReady) {
      setWasmLoadingStatus('Loading OpenSCAD WASM...');
    }

    if (generatorType === 'combined') {
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
    } else if (generatorType === 'box') {
      setWasmLoadingStatus('Generating box STL...');
      const scadContent = generateBoxScad(boxConfig);
      const localResult = await generateLocalStl(scadContent, 'box.stl');
      blobUrlsRef.current.push(localResult.stlUrl);
      setBoxResult({
        stlUrl: localResult.stlUrl,
        scadContent: localResult.scadContent,
        filename: localResult.filename
      });
    } else {
      // Baseplate
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
        const scadContent = generateBaseplateScad(baseplateConfig);
        const localResult = await generateLocalStl(scadContent, 'baseplate.stl');
        blobUrlsRef.current.push(localResult.stlUrl);
        setBaseplateResult({
          stlUrl: localResult.stlUrl,
          scadContent: localResult.scadContent,
          filename: localResult.filename
        });
      }
    }

    setIsWasmReady(true);
    setWasmLoadingStatus(null);
  }, [generatorType, boxConfig, baseplateConfig, isWasmReady, cleanupBlobUrls]);

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

  // Check WASM support
  const wasmSupported = isWasmSupported();

  return (
    <div className="h-screen flex flex-col bg-slate-950 grid-pattern">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          </div>

          {/* Type Selector */}
          <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-1">
            <button
              onClick={() => {
                setGeneratorType('box');
                setActiveEditor('box');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                generatorType === 'box'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Box / Bin
            </button>
            <button
              onClick={() => {
                setGeneratorType('baseplate');
                setActiveEditor('baseplate');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                generatorType === 'baseplate'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Baseplate
            </button>
            <button
              onClick={() => setGeneratorType('combined')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                generatorType === 'combined'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Combined View
            </button>
          </div>

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
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Config Panel */}
        <aside className="w-96 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 overflow-y-auto">
          {generatorType === 'combined' ? (
            <div className="h-full flex flex-col">
              {/* Tab Selector */}
              <div className="flex border-b border-slate-800">
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
              {/* Active Editor Panel */}
              <div className="flex-1 overflow-y-auto">
                <ConfigPanel
                  type={activeEditor}
                  boxConfig={boxConfig}
                  baseplateConfig={baseplateConfig}
                  onBoxConfigChange={handleBoxConfigChange}
                  onBaseplateConfigChange={handleBaseplateConfigChange}
                />
              </div>
            </div>
          ) : (
            <ConfigPanel
              type={generatorType}
              boxConfig={boxConfig}
              baseplateConfig={baseplateConfig}
              onBoxConfigChange={handleBoxConfigChange}
              onBaseplateConfigChange={handleBaseplateConfigChange}
            />
          )}
        </aside>

        {/* Preview Area */}
        <main className="flex-1 flex flex-col">
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
          <div className="flex-1 relative">
            {generatorType === 'combined' ? (
              <PreviewCanvas
                boxStlUrl={boxResult?.stlUrl || null}
                baseplateStlUrl={baseplateResult?.stlUrl || null}
                isLoading={isGenerating}
                isCombinedView={true}
                boxConfig={boxConfig}
                baseplateConfig={baseplateConfig}
              />
            ) : (
              <PreviewCanvas
                stlUrl={(generatorType === 'box' ? boxResult : baseplateResult)?.stlUrl || null}
                isLoading={isGenerating}
                isCombinedView={false}
              />
            )}
          </div>

          {/* Export Buttons */}
          {generatorType === 'combined' ? (
            <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/50 p-4 space-y-4">
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
          ) : (
            generatorType === 'box' ? (
              boxResult && (
                <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/50 p-4">
                  <ExportButtons
                    stlUrl={boxResult.stlUrl}
                    scadContent={boxResult.scadContent}
                    filename={boxResult.filename}
                  />
                </div>
              )
            ) : (
              multiSegmentResult ? (
                <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/50 p-4">
                  <MultiSegmentExportButtons
                    result={multiSegmentResult}
                    splitInfo={multiSegmentResult.splitInfo}
                    baseplateConfig={baseplateConfig}
                    generationMode={generationMode}
                  />
                </div>
              ) : baseplateResult && (
                <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/50 p-4">
                  <ExportButtons
                    stlUrl={baseplateResult.stlUrl}
                    scadContent={baseplateResult.scadContent}
                    filename={baseplateResult.filename}
                  />
                </div>
              )
            )
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
