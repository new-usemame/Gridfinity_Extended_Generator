import { MultiSegmentResult, SplitResult, SegmentGenerationResult } from '../../types/config';

interface ExportButtonsProps {
  stlUrl: string;
  scadContent: string;
  filename: string;
}

interface MultiSegmentExportButtonsProps {
  result: MultiSegmentResult;
  splitInfo: SplitResult;
}


export function ExportButtons({ stlUrl, scadContent, filename }: ExportButtonsProps) {
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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Ready to export:</span>
        <span className="text-sm font-mono text-green-400 bg-slate-800 px-2 py-1 rounded">{filename}</span>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Download STL Button */}
        <button
          onClick={downloadSTL}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-medium hover:from-green-500 hover:to-green-400 transition-all shadow-lg shadow-green-500/25"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download STL
        </button>

        {/* Download SCAD Button */}
        <button
          onClick={downloadSCAD}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Download SCAD
        </button>

        {/* Copy SCAD Button */}
        <button
          onClick={copySCAD}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 hover:text-white transition-colors"
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
export function MultiSegmentExportButtons({ result, splitInfo }: MultiSegmentExportButtonsProps) {
  const downloadAllSequentially = async () => {
    // Download all segments and connector sequentially
    for (const segment of result.segments) {
      await downloadSingleSegment(segment);
      // Small delay between downloads to avoid browser blocking
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    if (result.connector) {
      await new Promise(resolve => setTimeout(resolve, 300));
      downloadConnector();
    }
    
    // Download README
    const readme = generateReadme(splitInfo, result.connector !== null);
    const blob = new Blob([readme], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'README.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadSingleSegment = async (segment: SegmentGenerationResult) => {
    const link = document.createElement('a');
    link.href = segment.stlUrl;
    link.download = `segment_${segment.segmentX}_${segment.segmentY}.stl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadConnector = () => {
    if (!result.connector) return;
    const link = document.createElement('a');
    link.href = result.connector.stlUrl;
    link.download = 'connector.stl';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Split baseplate:</span>
          <span className="text-sm font-mono text-cyan-400 bg-slate-800 px-2 py-1 rounded">
            {splitInfo.segmentsX} x {splitInfo.segmentsY} segments
          </span>
          {result.connector && (
            <span className="text-sm font-mono text-emerald-400 bg-slate-800 px-2 py-1 rounded">
              + connectors
            </span>
          )}
        </div>
        
        {/* Download All */}
        <button
          onClick={downloadAllSequentially}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white text-sm font-medium hover:from-cyan-500 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-500/25"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download All
        </button>
      </div>

      {/* Individual Downloads */}
      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <h4 className="text-xs font-semibold text-slate-400 mb-2">INDIVIDUAL DOWNLOADS</h4>
        
        <div className="flex flex-wrap gap-2">
          {result.segments.map((segment: SegmentGenerationResult) => (
            <button
              key={`${segment.segmentX}-${segment.segmentY}`}
              onClick={() => downloadSingleSegment(segment)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-600 hover:text-white transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Segment [{segment.segmentX},{segment.segmentY}]
            </button>
          ))}
          
          {result.connector && (
            <button
              onClick={downloadConnector}
              className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-600 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Connector
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function generateReadme(splitInfo: SplitResult, hasConnectors: boolean): string {
  return `GRIDFINITY BASEPLATE - ASSEMBLY INSTRUCTIONS
=============================================

This ZIP contains a split baseplate with ${splitInfo.totalSegments} segments.

SEGMENT LAYOUT:
---------------
Grid: ${splitInfo.segmentsX} columns x ${splitInfo.segmentsY} rows
Each segment: up to ${splitInfo.maxSegmentUnitsX} x ${splitInfo.maxSegmentUnitsY} grid units

SEGMENTS:
---------
${splitInfo.segments.flat().map(seg => 
  `- segment_${seg.segmentX}_${seg.segmentY}.stl: ${seg.gridUnitsX}x${seg.gridUnitsY} units`
).join('\n')}

${hasConnectors ? `CONNECTORS:
-----------
- connector.stl: Print multiple copies to join segments together
- Insert connectors into the dovetail slots on adjacent segment edges
- Connectors should slide in smoothly and lock segments together

ASSEMBLY:
---------
1. Print all segments and connectors
2. Lay out segments in a grid according to their coordinates
3. Insert connectors between adjacent segments
4. Connectors create a flush, stable connection between pieces
` : `ASSEMBLY:
---------
1. Print all segments
2. Lay out segments in a grid according to their coordinates
3. Segments can be placed adjacent to each other on a flat surface
`}

TIPS:
-----
- Print segments flat (socket side up)
- Use same filament/settings for all pieces for best fit
- If connectors are too tight, increase tolerance in settings
- If connectors are loose, decrease tolerance

Generated by Gridfinity Generator
`;
}
