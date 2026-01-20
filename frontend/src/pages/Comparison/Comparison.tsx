export function Comparison() {
  return (
    <div className="min-h-screen py-16 px-6 bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Gridfinity Generator Comparison</h1>
        <p className="text-xl text-slate-700 dark:text-slate-300 mb-12">
          How our generator compares to other Gridfinity tools available online.
        </p>

        {/* Comparison Table */}
        <div className="overflow-x-auto mb-12">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-left text-slate-900 dark:text-white font-semibold">Feature</th>
                <th className="px-6 py-4 text-center text-slate-900 dark:text-white font-semibold">Our Generator</th>
                <th className="px-6 py-4 text-center text-slate-900 dark:text-white font-semibold">MakerWorld (ostat)</th>
                <th className="px-6 py-4 text-center text-slate-900 dark:text-white font-semibold">Perplexing Labs</th>
                <th className="px-6 py-4 text-center text-slate-900 dark:text-white font-semibold">cq-gridfinity</th>
                <th className="px-6 py-4 text-center text-slate-900 dark:text-white font-semibold">FusionGridfinity</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-300">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <td className="px-6 py-4 font-medium">Fractional Unit Sizes</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400">Partial</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <td className="px-6 py-4 font-medium">Wall Cutouts</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400">Limited</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <td className="px-6 py-4 font-medium">Wall Patterns</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <td className="px-6 py-4 font-medium">Sliding Lids</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400">Limited</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <td className="px-6 py-4 font-medium">Dividers & Trays</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400">Basic</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400">Basic</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <td className="px-6 py-4 font-medium">Split Baseplates</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <td className="px-6 py-4 font-medium">3D Preview</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400">Limited</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <td className="px-6 py-4 font-medium">Local Generation (WASM)</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <td className="px-6 py-4 font-medium">Comprehensive Docs</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400">GitHub Only</td>
                <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400">Basic</td>
                <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400">GitHub Only</td>
                <td className="px-6 py-4 text-center text-yellow-600 dark:text-yellow-400">GitHub Only</td>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <td className="px-6 py-4 font-medium">Donation Support</td>
                <td className="px-6 py-4 text-center text-green-600 dark:text-green-400">✓</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
                <td className="px-6 py-4 text-center text-red-600 dark:text-red-400">✗</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detailed Comparisons */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Detailed Tool Breakdown</h2>
          
          <div className="space-y-8">
            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">MakerWorld (ostat's Gridfinity Extended)</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                <strong>Strengths:</strong> Full feature set from Gridfinity Extended, online customizer, 
                actively maintained, large community.
              </p>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                <strong>Limitations:</strong> Some advanced features may not work fully in browser version, 
                limited preview capabilities, requires MakerWorld account for some features.
              </p>
              <a
                href="https://makerworld.com/en/models/481168-gridfinity-extended"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                Visit MakerWorld →
              </a>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Perplexing Labs Gridfinity Generator</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                <strong>Strengths:</strong> User accounts, saveable configurations, intuitive UI, good 3D preview, 
                professional-grade interface.
              </p>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                <strong>Limitations:</strong> Missing some extended features like fractional sizes, limited wall 
                cutout options, may lack some advanced customization.
              </p>
              <a
                href="https://printer.tools/tools/perplexing-labs-gridfinity/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                Visit Printer.tools →
              </a>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">cq-gridfinity (Python/CadQuery)</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                <strong>Strengths:</strong> Scripted generation, great for automation, supports baseplates and boxes, 
                Python-based for technical users.
              </p>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                <strong>Limitations:</strong> No web UI, requires Python knowledge, less focus on visual patterns 
                and extended features, best for technical users.
              </p>
              <a
                href="https://github.com/michaelgale/cq-gridfinity"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                Visit GitHub →
              </a>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">FusionGridfinityGenerator (Fusion 360 Add-in)</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                <strong>Strengths:</strong> Integrates with Fusion 360, parametric bins and baseplates, good for 
                CAD users already using Fusion 360.
              </p>
              <p className="text-slate-700 dark:text-slate-300 mb-3">
                <strong>Limitations:</strong> Requires Fusion 360 (paid software), less features for patterned 
                walls and tray extensions, fewer advanced customization options.
              </p>
              <a
                href="https://github.com/Le0Michine/FusionGridfinityGenerator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                Visit GitHub →
              </a>
            </div>
          </div>
        </section>

        {/* Our Advantages */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">What Sets Our Generator Apart</h2>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-xl p-6">
            <ul className="space-y-3 text-slate-700 dark:text-slate-300">
              <li>
                <strong className="text-slate-900 dark:text-white">✓ Full Extended Feature Support:</strong> All features from Gridfinity 
                Extended including fractional sizes, wall cutouts, patterns, and more.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">✓ Local Generation:</strong> Generate STLs entirely in your browser 
                using WASM—no server required, works offline.
              </li>
              <li>
                <strong className="text-white">✓ Comprehensive Documentation:</strong> Multiple pages explaining 
                Gridfinity, features, comparisons, and usage—not just a tool, but a resource.
              </li>
              <li>
                <strong className="text-white">✓ Better UX:</strong> Intuitive interface with real-time preview, 
                clear explanations, and helpful tooltips.
              </li>
              <li>
                <strong className="text-white">✓ Critical Missing Features:</strong> While we may have come later, 
                we include features that many other generators lack, such as proper fractional unit support, wall 
                cutouts, and comprehensive documentation.
              </li>
              <li>
                <strong className="text-white">✓ Donation Support:</strong> Built-in crypto donation system to 
                support ongoing development and hosting.
              </li>
            </ul>
          </div>
        </section>

        {/* When to Use Each */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">When to Use Each Tool</h2>
          <div className="space-y-4 text-slate-700 dark:text-slate-300">
            <p>
              <strong className="text-slate-900 dark:text-white">Our Generator:</strong> Best for users who want all Extended features 
              with a great web interface, local generation capability, and comprehensive documentation.
            </p>
            <p>
              <strong className="text-slate-900 dark:text-white">MakerWorld:</strong> Good if you already use MakerWorld and want 
              quick access to Extended features without leaving the platform.
            </p>
            <p>
              <strong className="text-white">Perplexing Labs:</strong> Great if you want user accounts and 
              saveable configurations, and don't need all Extended features.
            </p>
            <p>
              <strong className="text-white">cq-gridfinity:</strong> Perfect for technical users who want to 
              script generation or integrate into automated workflows.
            </p>
            <p>
              <strong className="text-white">FusionGridfinityGenerator:</strong> Ideal if you're already using 
              Fusion 360 and want Gridfinity integration in your CAD workflow.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
