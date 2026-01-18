interface ExportButtonsProps {
  stlUrl: string;
  scadContent: string;
  filename: string;
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
