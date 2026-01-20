export function About() {
  return (
    <div className="min-h-screen py-16 px-6 bg-white dark:bg-slate-950">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">About This Project</h1>

        {/* Gridfinity History */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">The History of Gridfinity</h2>
          <div className="prose prose-invert dark:prose-invert max-w-none">
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              Gridfinity was created by{' '}
              <a
                href="https://www.youtube.com/watch?v=ra_9zU-mnl8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                Zack Freedman
              </a>
              , a maker and YouTuber known for his innovative 3D printing projects. The system was designed to 
              solve a common problem: disorganized workshops and tool storage. Freedman's design philosophy 
              emphasized modularity, visibility, and accessibility.
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              The core concept is simple: a standardized grid unit of 42×42×7 mm that allows all components 
              (bins, baseplates, lids, accessories) to snap together in a modular system. This standardization 
              means you can mix and match components from different sources, as long as they follow the Gridfinity spec.
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
              Since its introduction, Gridfinity has grown into a thriving open-source ecosystem with thousands 
              of designs shared by the community. The{' '}
              <a
                href="https://www.reddit.com/r/gridfinity"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                r/gridfinity subreddit
              </a>
              {' '}has become a hub for sharing designs, tips, and modifications.
            </p>
          </div>
        </section>

        {/* Gridfinity Extended Evolution */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">The Evolution: Gridfinity Extended</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              While the original Gridfinity system was revolutionary, the community quickly identified areas 
              for enhancement. <strong className="text-white">Gridfinity Extended</strong>, created and maintained 
              by{' '}
              <a
                href="https://github.com/ostat"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                ostat
              </a>
              , emerged as a comprehensive extension of the original system.
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              Gridfinity Extended is built on OpenSCAD, a parametric 3D modeling language. This choice allows 
              for extensive customization through code, enabling features that would be difficult or impossible 
              in traditional CAD software. The project is open-source under the GPL-3.0 license, ensuring it 
              remains free and accessible.
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              Key additions in Gridfinity Extended include:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mb-4">
              <li><strong className="text-slate-900 dark:text-white">Fractional Unit Support:</strong> Half-grid sizes (21mm) and custom dimensions</li>
              <li><strong className="text-slate-900 dark:text-white">Wall Patterns:</strong> Decorative patterns like brick, sieve, and custom textures</li>
              <li><strong className="text-slate-900 dark:text-white">Advanced Cutouts:</strong> Custom cutouts on any side, not just standard openings</li>
              <li><strong className="text-slate-900 dark:text-white">Sliding Lids:</strong> Optional sliding lids with various configurations</li>
              <li><strong className="text-slate-900 dark:text-white">Internal Organization:</strong> Dividers, trays, and item holders</li>
              <li><strong className="text-slate-900 dark:text-white">Split Parts:</strong> Large baseplates can be split for easier printing</li>
              <li><strong className="text-slate-900 dark:text-white">Enhanced Baseplates:</strong> Multiple mounting options (magnets, screws, weighted)</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
              The project is actively maintained on{' '}
              <a
                href="https://github.com/ostat/gridfinity_extended_openscad"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                GitHub
              </a>
              {' '}and also available as an{' '}
              <a
                href="https://makerworld.com/en/models/481168-gridfinity-extended"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                online customizer on MakerWorld
              </a>
              .
            </p>
          </div>
        </section>

        {/* Our Project's Relationship */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">How Our Project Fits In</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              This <strong className="text-slate-900 dark:text-white">Gridfinity Extended Generator</strong> is built directly on top 
              of Gridfinity Extended. We're not trying to replace it or compete with it—we're enhancing it with 
              a better user experience and additional features.
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              Our project is based on the{' '}
              <a
                href="https://github.com/new-usemame/Gridfinity_Extended_Generator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                Gridfinity Extended Generator repository
              </a>
              , which itself builds on ostat's Gridfinity Extended. What we add:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mb-4">
              <li><strong className="text-slate-900 dark:text-white">Comprehensive Documentation:</strong> Detailed explanations of all features and how to use them</li>
              <li><strong className="text-slate-900 dark:text-white">Web Interface:</strong> Easy-to-use browser-based interface with real-time preview</li>
              <li><strong className="text-slate-900 dark:text-white">Local Generation:</strong> WASM support for generating STLs entirely in your browser</li>
              <li><strong className="text-slate-900 dark:text-white">Server Generation:</strong> Faster server-side generation for complex models</li>
              <li><strong className="text-slate-900 dark:text-white">SEO-Friendly Pages:</strong> Multiple pages explaining Gridfinity, features, and comparisons</li>
              <li><strong className="text-slate-900 dark:text-white">Donation System:</strong> Built-in crypto donation support to fund development</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
              We maintain full compatibility with the original Gridfinity Extended system, so any STL files 
              generated here will work perfectly with components from other sources.
            </p>
          </div>
        </section>

        {/* Technical Details */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Technical Details</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              <strong className="text-slate-900 dark:text-white">Frontend:</strong> Built with React, TypeScript, and Vite. Uses Three.js 
              and react-three-fiber for 3D previews. Styled with Tailwind CSS.
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              <strong className="text-white">Backend:</strong> Node.js with Express. Uses OpenSCAD CLI for STL generation.
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              <strong className="text-white">STL Generation:</strong> Supports both server-side generation (using 
              OpenSCAD installed on the server) and client-side generation (using OpenSCAD WASM in the browser).
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              <strong className="text-white">OpenSCAD Base:</strong> All SCAD generation is based on the Gridfinity 
              Extended OpenSCAD scripts, ensuring compatibility and accuracy.
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
              <strong className="text-white">Deployment:</strong> Can be deployed via Docker or Railway. The project 
              includes deployment configurations for both.
            </p>
          </div>
        </section>

        {/* Citations */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Citations & Resources</h2>
          <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <ul className="space-y-3 text-slate-700 dark:text-slate-300">
              <li>
                <strong className="text-slate-900 dark:text-white">Gridfinity by Zack Freedman:</strong>{' '}
                <a
                  href="https://www.youtube.com/watch?v=ra_9zU-mnl8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
                >
                  YouTube Video
                </a>
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">Gridfinity Extended by ostat:</strong>{' '}
                <a
                  href="https://github.com/ostat/gridfinity_extended_openscad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <strong className="text-white">Gridfinity Extended Online Customizer:</strong>{' '}
                <a
                  href="https://makerworld.com/en/models/481168-gridfinity-extended"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
                >
                  MakerWorld
                </a>
              </li>
              <li>
                <strong className="text-white">Gridfinity Community:</strong>{' '}
                <a
                  href="https://www.reddit.com/r/gridfinity"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
                >
                  r/gridfinity on Reddit
                </a>
              </li>
              <li>
                <strong className="text-white">This Project:</strong>{' '}
                <a
                  href="https://github.com/new-usemame/Gridfinity_Extended_Generator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
                >
                  Gridfinity Extended Generator on GitHub
                </a>
              </li>
              <li>
                <strong className="text-white">OpenSCAD:</strong>{' '}
                <a
                  href="https://openscad.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
                >
                  OpenSCAD Official Website
                </a>
              </li>
            </ul>
          </div>
        </section>

        {/* License */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">License</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              This project is licensed under the <strong className="text-white">GPL-3.0 License</strong>, 
              the same license as Gridfinity Extended. This ensures the project remains free and open-source.
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
              Based on the excellent work of{' '}
              <a
                href="https://github.com/ostat/gridfinity_extended_openscad"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                gridfinity_extended_openscad
              </a>
              {' '}by ostat.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
