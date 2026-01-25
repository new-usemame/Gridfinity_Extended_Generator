import React from 'react';
import { MultiSegmentResult, SplitResult, SegmentGenerationResult, BaseplateConfig } from '../../types/config';

interface User {
  id: number;
  email: string;
}

interface MultiSegmentExportButtonsProps {
  result: MultiSegmentResult;
  splitInfo: SplitResult;
  baseplateConfig: BaseplateConfig; // Need config to regenerate segments
  isConfigSaved?: boolean;
  user?: User | null;
  onSaveRequest?: () => void;
  onAuthRequest?: () => void;
}

interface ExportButtonsProps {
  stlUrl: string;
  scadContent: string;
  filename: string;
  isConfigSaved?: boolean;
  user?: User | null;
  onSaveRequest?: () => void;
  onAuthRequest?: () => void;
}


export function ExportButtons({ stlUrl, scadContent, filename, isConfigSaved: _isConfigSaved = true, user: _user, onSaveRequest: _onSaveRequest, onAuthRequest: _onAuthRequest }: ExportButtonsProps) {
  const downloadSTL = () => {
    const link = document.createElement('a');
    link.href = stlUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSCAD = () => {
    const blob = new Blob([scadContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace('.stl', '.scad');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copySCAD = async () => {
    try {
      await navigator.clipboard.writeText(scadContent);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-shrink">
        <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Ready to export:</span>
        <span className="text-sm font-mono text-green-600 dark:text-green-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded truncate">{filename}</span>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Download STL Button */}
        <button
          onClick={downloadSTL}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 text-white text-sm font-medium hover:from-green-500 hover:to-green-400 dark:hover:from-green-400 dark:hover:to-green-300 transition-all shadow-md shadow-green-500/20 dark:shadow-green-500/25 hover:shadow-green-500/30 dark:hover:shadow-green-500/40 flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download STL
        </button>

        {/* Download SCAD Button */}
        <button
          onClick={downloadSCAD}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Download SCAD
        </button>

        {/* Copy SCAD Button */}
        <button
          onClick={copySCAD}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy SCAD
        </button>
      </div>
    </div>
  );
}

// Multi-segment export buttons with individual downloads
export function MultiSegmentExportButtons({ result, splitInfo, baseplateConfig, isConfigSaved: _isConfigSaved = true, user: _user, onSaveRequest: _onSaveRequest, onAuthRequest: _onAuthRequest }: MultiSegmentExportButtonsProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatingSegment, setGeneratingSegment] = React.useState<string | null>(null);

  const downloadAllSequentially = async () => {
    setIsGenerating(true);
    setGeneratingSegment('all');
    
    try {
      // Request the server to generate all segments and return as zip
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
      
      // Get the zip file as a blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `baseplate_segments_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download zip:', err);
      // Fallback to individual downloads if zip fails
      for (const segment of result.segments) {
        setGeneratingSegment(`${segment.segmentX},${segment.segmentY}`);
        await downloadSingleSegment(segment, true);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Download README with interlocking edge info
      const readme = generateReadme(splitInfo, baseplateConfig.connectorEnabled, baseplateConfig.edgePattern);
      const blob = new Blob([readme], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'README.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    setIsGenerating(false);
    setGeneratingSegment(null);
  };

  const downloadSingleSegment = async (segment: SegmentGenerationResult, skipState = false) => {
    if (!skipState) {
      setIsGenerating(true);
      setGeneratingSegment(`${segment.segmentX},${segment.segmentY}`);
    }
    
    try {
      // Request the server to generate this specific segment
      const response = await fetch('/api/generate/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: baseplateConfig,
          segmentX: segment.segmentX,
          segmentY: segment.segmentY
        })
      });
      
      let downloadUrl: string;
      if (!response.ok) {
        // Fallback to the preview URL
        downloadUrl = segment.stlUrl;
      } else {
        const data = await response.json();
        downloadUrl = data.stlUrl;
      }
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `segment_${segment.segmentX}_${segment.segmentY}.stl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to generate segment:', err);
      // Fallback to preview URL
      const link = document.createElement('a');
      link.href = segment.stlUrl;
      link.download = `segment_${segment.segmentX}_${segment.segmentY}.stl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    if (!skipState) {
      setIsGenerating(false);
      setGeneratingSegment(null);
    }
  };

  return (
    <div className="space-y-3 min-w-0">
      {/* Primary Action: Download All */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Split baseplate:</span>
          <span className="text-sm font-mono text-cyan-600 dark:text-cyan-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded whitespace-nowrap">
            {splitInfo.segmentsX} x {splitInfo.segmentsY} segments
          </span>
          {baseplateConfig.connectorEnabled && (
            <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded whitespace-nowrap">
              interlocking edges
            </span>
          )}
        </div>
        
        <button
          onClick={downloadAllSequentially}
          disabled={isGenerating}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all shadow-md flex-shrink-0 ${
            isGenerating 
              ? 'bg-slate-400 dark:bg-slate-600 cursor-wait' 
              : 'bg-gradient-to-r from-cyan-500 to-cyan-400 dark:from-cyan-600 dark:to-cyan-500 hover:from-cyan-400 hover:to-cyan-300 dark:hover:from-cyan-500 dark:hover:to-cyan-400 shadow-cyan-500/20 dark:shadow-cyan-500/25'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="whitespace-nowrap">Generating {generatingSegment === 'connector' ? 'connector' : generatingSegment === 'all' ? 'all segments' : `[${generatingSegment}]`}...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download All
            </>
          )}
        </button>
      </div>

      {/* Individual Downloads - Secondary Options */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-500 whitespace-nowrap">Or download individually:</span>
        <div className="flex flex-wrap gap-1.5">
          {result.segments.map((segment: SegmentGenerationResult) => {
            const segKey = `${segment.segmentX},${segment.segmentY}`;
            const isThisGenerating = isGenerating && generatingSegment === segKey;
            return (
              <button
                key={`${segment.segmentX}-${segment.segmentY}`}
                onClick={() => downloadSingleSegment(segment)}
                disabled={isGenerating}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isThisGenerating 
                    ? 'bg-cyan-600 dark:bg-cyan-700 text-white animate-pulse'
                    : isGenerating
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {isThisGenerating ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                [{segment.segmentX},{segment.segmentY}]
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function generateReadme(splitInfo: SplitResult, hasInterlocking: boolean, edgePattern: string): string {
  const patternNames: Record<string, string> = {
    'dovetail': 'Dovetail (Trapezoidal)',
    'rectangular': 'Rectangular (Square)',
    'triangular': 'Triangular (Sawtooth)',
    'puzzle': 'Puzzle (Jigsaw Bulb)',
    'tslot': 'T-Slot (T-Hook)'
  };
  
  return `GRIDFINITY BASEPLATE - ASSEMBLY INSTRUCTIONS
=============================================

This contains a split baseplate with ${splitInfo.totalSegments} segments.

SEGMENT LAYOUT:
---------------
Grid: ${splitInfo.segmentsX} columns x ${splitInfo.segmentsY} rows
Each segment: up to ${splitInfo.maxSegmentUnitsX} x ${splitInfo.maxSegmentUnitsY} grid units

SEGMENTS:
---------
${splitInfo.segments.flat().map(seg => 
  `- segment_${seg.segmentX}_${seg.segmentY}.stl: ${seg.gridUnitsX}x${seg.gridUnitsY} units`
).join('\n')}

${hasInterlocking ? `INTERLOCKING EDGES:
-------------------
Edge Pattern: ${patternNames[edgePattern] || edgePattern}

Each segment has interlocking male/female edges built directly in:
- Right and Back edges have MALE teeth (protrude outward)
- Left and Front edges have FEMALE cavities (receive teeth from neighbor)
- Segments snap together - no separate connectors needed!

ASSEMBLY:
---------
1. Print all segments (print flat, socket side up, no supports needed)
2. Lay out segments according to their [X,Y] coordinates
3. Snap segments together - male teeth lock into female cavities
4. Segments align flush and lock securely

PRINTING TIPS:
--------------
- All edges print vertically (2D profile extruded in Z) - no overhangs!
- Print at 0.2mm layer height for good interlocking detail
- If fit is too tight, increase tolerance in settings
- If fit is loose, decrease tolerance
` : `ASSEMBLY:
---------
1. Print all segments
2. Lay out segments in a grid according to their coordinates
3. Segments can be placed adjacent to each other on a flat surface
`}

Generated by Gridfinity Generator (beta)
`;
}
