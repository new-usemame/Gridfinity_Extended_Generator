/**
 * OpenSCAD WASM Service - Client-side STL rendering
 * Uses openscad-wasm to render SCAD code to STL entirely in the browser
 */

import type { OpenSCADInstance } from 'openscad-wasm';

// Cache the createOpenSCAD function after first import
let createOpenSCADFn: ((options?: Record<string, unknown>) => Promise<OpenSCADInstance>) | null = null;
let importPromise: Promise<void> | null = null;

// Track if WASM has been loaded at least once
let wasmEverLoaded = false;

/**
 * Ensure the openscad-wasm module is imported
 */
async function ensureModuleLoaded(): Promise<void> {
  if (createOpenSCADFn) return;
  
  if (importPromise) {
    await importPromise;
    return;
  }

  importPromise = (async () => {
    const module = await import('openscad-wasm');
    createOpenSCADFn = module.createOpenSCAD;
    wasmEverLoaded = true;
  })();

  await importPromise;
}

/**
 * Create a fresh OpenSCAD instance for rendering
 * We create a new instance each time to avoid state issues with the WASM module
 */
async function createFreshInstance(): Promise<OpenSCADInstance> {
  await ensureModuleLoaded();
  
  if (!createOpenSCADFn) {
    throw new Error('Failed to load openscad-wasm module');
  }

  console.log('[OpenSCAD] Creating fresh WASM instance...');
  
  const instance = await createOpenSCADFn({
    noInitialRun: true,
    print: (text: string) => console.log('[OpenSCAD]', text),
    printErr: (text: string) => console.warn('[OpenSCAD Error]', text),
  });

  return instance;
}

// Keep a reference for compatibility with existing code
let wasmInstance: OpenSCADInstance | null = null;

/**
 * Get the cached WASM instance (for preloading check)
 */
async function getWasmInstance(): Promise<OpenSCADInstance> {
  if (!wasmInstance) {
    wasmInstance = await createFreshInstance();
  }
  return wasmInstance;
}

/**
 * Check if OpenSCAD WASM module has been loaded at least once
 */
export function isWasmLoaded(): boolean {
  return wasmEverLoaded;
}

/**
 * Preload the OpenSCAD WASM module (optional - for better UX)
 */
export async function preloadWasm(): Promise<void> {
  await getWasmInstance();
}

/**
 * Render SCAD code to STL using the low-level API for maximum control
 * Creates a fresh instance each time to avoid WASM state issues
 * @param scadContent - The OpenSCAD source code
 * @returns A Blob containing the STL file data
 */
export async function renderScadToStl(scadContent: string): Promise<Blob> {
  console.log('[OpenSCAD] Starting render...');
  console.log('[OpenSCAD] SCAD content length:', scadContent.length);

  // Create a fresh instance for this render
  const instance = await createFreshInstance();
  const openscad = instance.getInstance();

  // Write the SCAD code to a virtual file
  openscad.FS.writeFile('/input.scad', scadContent);
  console.log('[OpenSCAD] Wrote input.scad to virtual FS');

  let stlString: string | null = null;

  // Run OpenSCAD - it may throw an exit status
  try {
    const exitCode = openscad.callMain(['/input.scad', '-o', '/output.stl']);
    console.log('[OpenSCAD] callMain returned:', exitCode);
  } catch (exitError: unknown) {
    // Emscripten throws when the program calls exit()
    // This is expected behavior, not an error
    console.log('[OpenSCAD] callMain threw (expected for exit):', typeof exitError, exitError);
  }

  // Now try to read the output file
  try {
    stlString = openscad.FS.readFile('/output.stl', { encoding: 'utf8' }) as string;
    console.log('[OpenSCAD] Read output.stl, length:', stlString?.length || 0);
  } catch (readError) {
    console.error('[OpenSCAD] Failed to read /output.stl:', readError);
    
    // List files to debug (readdir may not be in type definitions)
    try {
      console.log('[OpenSCAD] Listing root directory...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const files = (openscad.FS as any).readdir('/');
      console.log('[OpenSCAD] Files in /:', files);
    } catch (listError) {
      console.error('[OpenSCAD] Could not list directory:', listError);
    }
    
    throw new Error('OpenSCAD did not create output file. Check browser console for details.');
  }

  // Clean up virtual files (best effort)
  try {
    openscad.FS.unlink('/input.scad');
    openscad.FS.unlink('/output.stl');
  } catch {
    // Ignore cleanup errors
  }

  if (!stlString || stlString.length === 0) {
    throw new Error('OpenSCAD returned empty STL output');
  }

  // Validate STL format
  const trimmedStart = stlString.trim().substring(0, 50).toLowerCase();
  console.log('[OpenSCAD] STL starts with:', trimmedStart);

  if (!trimmedStart.startsWith('solid')) {
    console.warn('[OpenSCAD] Warning: Output may not be valid ASCII STL');
  }

  console.log('[OpenSCAD] Render complete! STL size:', stlString.length, 'bytes');

  // Convert string to Blob
  return new Blob([stlString], { type: 'application/octet-stream' });
}

/**
 * Generation result type for local mode
 */
export interface LocalGenerationResult {
  stlBlob: Blob;
  stlUrl: string; // blob URL
  scadContent: string;
  filename: string;
}

/**
 * Generate STL from SCAD content locally
 * Creates a blob URL that can be used for download or preview
 */
export async function generateLocalStl(
  scadContent: string,
  filename: string
): Promise<LocalGenerationResult> {
  const stlBlob = await renderScadToStl(scadContent);
  const stlUrl = URL.createObjectURL(stlBlob);

  return {
    stlBlob,
    stlUrl,
    scadContent,
    filename,
  };
}

/**
 * Revoke a blob URL to free memory
 * Call this when you're done with a generated STL
 */
export function revokeLocalStlUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Check if the browser supports WebAssembly (required for local generation)
 */
export function isWasmSupported(): boolean {
  try {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      );
      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
      }
    }
  } catch {
    // WebAssembly not supported
  }
  return false;
}
