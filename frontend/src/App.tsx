import { useState, useCallback } from 'react';
import { ConfigPanel } from './components/ConfigPanel/ConfigPanel';
import { PreviewCanvas } from './components/PreviewCanvas/PreviewCanvas';
import { ExportButtons } from './components/ExportButtons/ExportButtons';
import { BoxConfig, BaseplateConfig, defaultBoxConfig, defaultBaseplateConfig, GenerationResult } from './types/config';

type GeneratorType = 'box' | 'baseplate' | 'combined';

function App() {
  const [generatorType, setGeneratorType] = useState<GeneratorType>('box');
  const [boxConfig, setBoxConfig] = useState<BoxConfig>(defaultBoxConfig);
  const [baseplateConfig, setBaseplateConfig] = useState<BaseplateConfig>(defaultBaseplateConfig);
  const [boxResult, setBoxResult] = useState<GenerationResult | null>(null);
  const [baseplateResult, setBaseplateResult] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<'box' | 'baseplate'>('box');

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (generatorType === 'combined') {
        // Generate both box and baseplate
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

        const boxResult: GenerationResult = await boxResponse.json();
        const baseplateResult: GenerationResult = await baseplateResponse.json();
        setBoxResult(boxResult);
        setBaseplateResult(baseplateResult);
      } else {
        // Generate single item
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

        const result: GenerationResult = await response.json();
        if (generatorType === 'box') {
          setBoxResult(result);
        } else {
          setBaseplateResult(result);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  }, [generatorType, boxConfig, baseplateConfig]);

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

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isGenerating
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400 shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
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
              'Generate STL'
            )}
          </button>
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
                  onBoxConfigChange={setBoxConfig}
                  onBaseplateConfigChange={setBaseplateConfig}
                />
              </div>
            </div>
          ) : (
            <ConfigPanel
              type={generatorType}
              boxConfig={boxConfig}
              baseplateConfig={baseplateConfig}
              onBoxConfigChange={setBoxConfig}
              onBaseplateConfigChange={setBaseplateConfig}
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
            <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/50 p-4 flex gap-2">
              {boxResult && (
                <ExportButtons
                  stlUrl={boxResult.stlUrl}
                  scadContent={boxResult.scadContent}
                  filename={boxResult.filename}
                />
              )}
              {baseplateResult && (
                <ExportButtons
                  stlUrl={baseplateResult.stlUrl}
                  scadContent={baseplateResult.scadContent}
                  filename={baseplateResult.filename}
                />
              )}
            </div>
          ) : (
            (generatorType === 'box' ? boxResult : baseplateResult) && (
              <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/50 p-4">
                <ExportButtons
                  stlUrl={(generatorType === 'box' ? boxResult : baseplateResult)!.stlUrl}
                  scadContent={(generatorType === 'box' ? boxResult : baseplateResult)!.scadContent}
                  filename={(generatorType === 'box' ? boxResult : baseplateResult)!.filename}
                />
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
