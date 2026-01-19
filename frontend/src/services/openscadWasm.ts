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
 * Render SCAD code to STL
 * @param scadContent - The OpenSCAD source code
 * @returns A Blob containing the STL file data
 */
export async function renderScadToStl(scadContent: string): Promise<Blob> {
  const instance = await getWasmInstance();

  // Use the built-in renderToStl method which returns STL as string
  const stlString = await instance.renderToStl(scadContent);

  // Convert string to Blob
  // STL files from OpenSCAD are typically ASCII format
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
