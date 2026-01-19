import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Gridfinity Extended Generator
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
            The most customizable, feature-rich generator for creating Gridfinity storage bins and baseplates. 
            Generate STL files for 3D printing directly in your browser.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/generator"
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold text-lg hover:from-green-500 hover:to-green-400 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
            >
              Start Generating
            </Link>
            <Link
              to="/features"
              className="px-8 py-4 bg-slate-800 text-white rounded-xl font-semibold text-lg hover:bg-slate-700 transition-all"
            >
              Learn More
            </Link>
            <Link
              to="/donate"
              className="px-8 py-4 bg-cyan-600 text-white rounded-xl font-semibold text-lg hover:bg-cyan-500 transition-all"
            >
              Support Us
            </Link>
          </div>
        </div>
      </section>

      {/* What is Gridfinity */}
      <section className="py-16 px-6 bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">What is Gridfinity?</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              Gridfinity is an open-source modular organization system created by{' '}
              <a
                href="https://www.youtube.com/watch?v=ra_9zU-mnl8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
              >
                Zack Freedman
              </a>
              . It's designed around a standardized grid unit (42×42×7 mm) so that bins, trays, baseplates, 
              and lids can all snap together in a modular grid system. The design philosophy emphasizes 
              visibility, accessibility, efficiency, and freeing up time to build projects rather than hunt for tools.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed">
              Components are mostly 3D printable using FDM (Fused Deposition Modeling) printers, and there's 
              a thriving community producing compatible bins, lids, and accessories. Baseplates form the foundation 
              of the system, providing the grid structure that everything else connects to.
            </p>
          </div>
        </div>
      </section>

      {/* What is Gridfinity Extended */}
      <section className="py-16 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">What is Gridfinity Extended?</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              <strong className="text-white">Gridfinity Extended</strong> is an OpenSCAD-based extension of the 
              original Gridfinity system, maintained by{' '}
              <a
                href="https://github.com/ostat/gridfinity_extended_openscad"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
              >
                ostat
              </a>
              . It takes the core Gridfinity library and adds{' '}
              <strong className="text-white">greatly expanded customization options</strong> that the community 
              has been asking for.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              Key features of Gridfinity Extended include:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li><strong className="text-white">Wall Patterns:</strong> Brick, sieve, and decorative patterns for bin walls</li>
              <li><strong className="text-white">Wall Cutouts:</strong> Custom cutouts on any side for easy access</li>
              <li><strong className="text-white">Fractional Unit Sizes:</strong> Half-grid sizes (21mm) and custom dimensions for odd spaces</li>
              <li><strong className="text-white">Sliding Lids:</strong> Optional sliding lids for bins</li>
              <li><strong className="text-white">Dividers & Trays:</strong> Internal compartment dividers and tray extensions</li>
              <li><strong className="text-white">Split Baseplates:</strong> Large baseplates can be split for easier printing</li>
              <li><strong className="text-white">Magnet & Screw Mounts:</strong> Various mounting options for baseplates</li>
              <li><strong className="text-white">Custom Labels:</strong> Label tabs on multiple sides</li>
            </ul>
            <p className="text-slate-300 text-lg leading-relaxed">
              The project is open-source, maintained under GPL-3.0, and provides both an{' '}
              <a
                href="https://makerworld.com/en/models/481168-gridfinity-extended"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
              >
                online customizer via MakerWorld
              </a>
              {' '}and downloadable OpenSCAD scripts for local use.
            </p>
          </div>
        </div>
      </section>

      {/* Our Project */}
      <section className="py-16 px-6 bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">Our Project</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              This <strong className="text-white">Gridfinity Extended Generator</strong> builds directly on top of 
              Gridfinity Extended, providing an enhanced web interface with improved usability and additional features. 
              Our project is based on the{' '}
              <a
                href="https://github.com/new-usemame/Gridfinity_Extended_Generator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
              >
                Gridfinity Extended Generator repository
              </a>
              .
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              What makes our generator unique:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li><strong className="text-white">Comprehensive Documentation:</strong> Detailed explanations of Gridfinity Extended and all features</li>
              <li><strong className="text-white">Real-time 3D Preview:</strong> See your designs before generating STL files</li>
              <li><strong className="text-white">Local & Server Generation:</strong> Generate STLs in your browser (WASM) or on the server</li>
              <li><strong className="text-white">All Extended Features:</strong> Full support for fractional sizes, wall cutouts, patterns, and more</li>
              <li><strong className="text-white">Better UX:</strong> Intuitive interface with clear explanations and tooltips</li>
              <li><strong className="text-white">Donation Support:</strong> Built-in crypto donation system to support development</li>
            </ul>
            <p className="text-slate-300 text-lg leading-relaxed">
              We're not reinventing the wheel—we're making Gridfinity Extended more accessible and easier to use 
              while maintaining full compatibility with the original system.
            </p>
          </div>
        </div>
      </section>

      {/* Key Advantages */}
      <section className="py-16 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">Why Choose Our Generator?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-3">Fractional Unit Support</h3>
              <p className="text-slate-300">
                Many generators only support whole grid units. We support fractional sizes (0.5, 1.5, etc.) 
                and custom dimensions, giving you flexibility to fit odd spaces.
              </p>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-3">Wall Cutouts</h3>
              <p className="text-slate-300">
                Add custom cutouts on any side of your bins for easy access. This feature is rare in other 
                generators but essential for many use cases.
              </p>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-3">Wall Patterns</h3>
              <p className="text-slate-300">
                Customize your bins with decorative wall patterns including brick, sieve, and other styles 
                to match your aesthetic preferences.
              </p>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-3">Split Baseplates</h3>
              <p className="text-slate-300">
                Large baseplates can be automatically split into smaller segments for easier printing on 
                smaller print beds, with connectors included.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16 px-6 bg-slate-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-slate-300 text-lg mb-8">
            Start generating your custom Gridfinity bins and baseplates in seconds. No installation required—just 
            configure your settings and download your STL files.
          </p>
          <Link
            to="/generator"
            className="inline-block px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold text-lg hover:from-green-500 hover:to-green-400 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
          >
            Launch Generator
          </Link>
        </div>
      </section>

      {/* Comparison Teaser */}
      <section className="py-16 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">How We Compare</h2>
          <p className="text-slate-300 text-lg mb-6">
            There are several Gridfinity generators available, each with their strengths. While we may have 
            come later to the scene, we include many critical features that others are missing, such as 
            fractional unit support, wall cutouts, and comprehensive documentation.
          </p>
          <Link
            to="/comparison"
            className="inline-block px-6 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-all"
          >
            See Full Comparison →
          </Link>
        </div>
      </section>
    </div>
  );
}
