export function Features() {
  return (
    <div className="min-h-screen py-16 px-6 bg-white dark:bg-slate-950">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Features</h1>
        <p className="text-xl text-slate-700 dark:text-slate-300 mb-12">
          Comprehensive breakdown of all features available in the Gridfinity Extended Generator.
        </p>

        {/* Core Features */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Core Features</h2>
          <div className="space-y-6">
            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Bins & Boxes</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Create customizable storage bins with full control over dimensions, wall thickness, and floor thickness.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Width and depth in grid units (0.5-8 units)</li>
                <li>Height in grid units (1-10 units)</li>
                <li>Adjustable wall thickness (0.8-2.4 mm)</li>
                <li>Adjustable floor thickness (0.7-2.0 mm)</li>
                <li>Corner radius for easier printing (0-5 mm)</li>
              </ul>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Baseplates</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Generate baseplates that form the foundation of your Gridfinity system.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Width and depth in grid units (1-10 units)</li>
                <li>Multiple styles: default, magnet holes, weighted (hollow), or screw holes</li>
                <li>Lid options: none, flat lid, or half-pitch grid</li>
                <li>Split baseplates for easier printing on smaller beds</li>
                <li>Corner radius and segment control</li>
              </ul>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Lids</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Various lid options for your bins, including flat lids and sliding lids.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Flat lids for standard bins</li>
                <li>Sliding lids with customizable configurations</li>
                <li>Half-pitch grid lids for baseplates</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Extended Features */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Extended Features</h2>
          <div className="space-y-6">
            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Wall Patterns</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Add decorative patterns to your bin walls for aesthetic appeal or functional purposes.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Brick pattern for textured walls</li>
                <li>Sieve pattern for ventilation</li>
                <li>Custom decorative patterns</li>
                <li>Pattern density and size control</li>
              </ul>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Wall Cutouts</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Create custom cutouts on any side of your bins for easy access or visual appeal.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Finger slides on any side</li>
                <li>Custom cutout shapes and sizes</li>
                <li>Multiple cutouts per bin</li>
                <li>Position control for precise placement</li>
              </ul>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Fractional Unit Sizes</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Support for half-grid sizes and custom dimensions to fit odd spaces.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Half-unit sizes (0.5, 1.5, 2.5, etc.)</li>
                <li>Custom millimeter dimensions</li>
                <li>Non-standard bin shapes</li>
                <li>Perfect for tight spaces</li>
              </ul>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Dividers & Trays</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Internal organization options for better compartmentalization.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>X and Y dividers for compartments</li>
                <li>Removable dividers</li>
                <li>Tray extensions</li>
                <li>Item holders for specific tools</li>
              </ul>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Labels</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Label tabs for easy identification of bin contents.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Label tabs on any side</li>
                <li>Multiple label positions</li>
                <li>Customizable label size</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Advanced Features */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Advanced Features</h2>
          <div className="space-y-6">
            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Magnet & Screw Mounts</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Various mounting options for baseplates and bins.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Magnet holes with configurable diameter and depth</li>
                <li>Screw mounting holes</li>
                <li>Weighted baseplates (hollow for adding weight)</li>
                <li>Multiple mounting options per baseplate</li>
              </ul>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Split Baseplates</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Large baseplates can be automatically split into smaller segments for easier printing.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Automatic segmentation based on print bed size</li>
                <li>Connector pieces for joining segments</li>
                <li>Preview of complete baseplate</li>
                <li>Individual segment downloads</li>
              </ul>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Custom Cutouts</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Create custom cutout shapes beyond standard rectangular openings.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Custom cutout shapes</li>
                <li>Multiple cutouts per bin</li>
                <li>Position and size control</li>
                <li>Odd-shape bins</li>
              </ul>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Lip Styles</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Control the stacking lip on bins for different use cases.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>No lip for flush stacking</li>
                <li>Standard lip for secure stacking</li>
                <li>Reduced lip for easier removal</li>
              </ul>
            </div>
          </div>
        </section>

        {/* UI Features */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">User Interface Features</h2>
          <div className="space-y-6">
            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Real-Time 3D Preview</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                See your designs in 3D before generating STL files.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Interactive 3D preview with rotation and zoom</li>
                <li>Combined view of box and baseplate</li>
                <li>Real-time updates as you change settings</li>
                <li>Loading indicators during generation</li>
              </ul>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Server Generation</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Fast server-side generation for all models.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Fast generation with server-side processing</li>
                <li>Handles complex models efficiently</li>
                <li>Progress indicators during generation</li>
              </ul>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Export Options</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                Multiple ways to get your generated files.
              </p>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                <li>Download STL files directly</li>
                <li>View and download OpenSCAD source code</li>
                <li>Batch download for split baseplates</li>
                <li>Preview before downloading</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
