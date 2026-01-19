/**
 * OpenSCAD WASM Service - Client-side STL rendering
 * Uses openscad-wasm to render SCAD code to STL entirely in the browser
 */

import type { OpenSCADInstance } from 'openscad-wasm';

// Lazy-loaded WASM instance
let wasmInstance: OpenSCADInstance | null = null;
let loadingPromise: Promise<OpenSCADInstance> | null = null;

/**
 * Get or create the OpenSCAD WASM instance (lazy loading)
 */
async function getWasmInstance(): Promise<OpenSCADInstance> {
  // Return existing instance if available
  if (wasmInstance) {
    return wasmInstance;
  }

  // If already loading, wait for it
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      // Dynamic import of openscad-wasm
      const { createOpenSCAD } = await import('openscad-wasm');
      
      // Initialize the module
      const instance = await createOpenSCAD({
        noInitialRun: true,
        print: (text: string) => console.log('[OpenSCAD]', text),
        printErr: (text: string) => console.warn('[OpenSCAD Error]', text),
      });

      wasmInstance = instance;
      return instance;
    } catch (error) {
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
}

/**
 * Check if OpenSCAD WASM is loaded
 */
export function isWasmLoaded(): boolean {
  return wasmInstance !== null;
}

/**
 * Preload the OpenSCAD WASM module (optional - for better UX)
 */
export async function preloadWasm(): Promise<void> {
  await getWasmInstance();
}

/**
 * Render SCAD code to STL using the low-level API for better error handling
 * @param scadContent - The OpenSCAD source code
 * @returns A Blob containing the STL file data
 */
export async function renderScadToStl(scadContent: string): Promise<Blob> {
  const wasmInstance = await getWasmInstance();
  const openscad = wasmInstance.getInstance();

  console.log('[OpenSCAD] Starting render...');
  console.log('[OpenSCAD] SCAD content length:', scadContent.length);

  try {
    // Write the SCAD code to a virtual file
    openscad.FS.writeFile('/input.scad', scadContent);
    console.log('[OpenSCAD] Wrote input.scad');

    // Run OpenSCAD to generate the STL
    const exitCode = openscad.callMain(['/input.scad', '-o', '/output.stl']);
    console.log('[OpenSCAD] callMain exit code:', exitCode);

    // Check if rendering was successful
    if (exitCode !== 0) {
      throw new Error(`OpenSCAD rendering failed with exit code ${exitCode}`);
    }

    // Read the output STL file
    let stlString: string;
    try {
      stlString = openscad.FS.readFile('/output.stl', { encoding: 'utf8' }) as string;
      console.log('[OpenSCAD] Read output.stl, length:', stlString?.length || 0);
    } catch (readError) {
      console.error('[OpenSCAD] Failed to read output.stl:', readError);
      throw new Error('Failed to read generated STL file - rendering may have failed');
    }

    // Clean up virtual files
    try {
      openscad.FS.unlink('/input.scad');
      openscad.FS.unlink('/output.stl');
    } catch (cleanupError) {
      console.warn('[OpenSCAD] Cleanup warning:', cleanupError);
    }

    if (!stlString || stlString.length === 0) {
      throw new Error('OpenSCAD returned empty STL output');
    }

    // Validate STL format (should start with "solid")
    if (!stlString.trim().toLowerCase().startsWith('solid')) {
      console.warn('[OpenSCAD] Warning: STL may be in binary format or invalid');
    }

    console.log('[OpenSCAD] Render complete, STL length:', stlString.length);

    // Convert string to Blob
    return new Blob([stlString], { type: 'application/octet-stream' });
  } catch (error) {
    console.error('[OpenSCAD] Render failed:', error);
    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`OpenSCAD error: ${String(error)}`);
  }
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
