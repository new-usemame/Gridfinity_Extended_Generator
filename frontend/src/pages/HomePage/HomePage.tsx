import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FeedbackModal } from '../../components/FeedbackModal';
import { AuthModal } from '../../components/AuthModal';

interface Feedback {
  id: number;
  user_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function HomePage() {
  const { user, token } = useAuth();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [userFeedback, setUserFeedback] = useState<Feedback | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Fetch all feedback
  const fetchAllFeedback = async () => {
    try {
      const response = await fetch('/api/feedback');
      if (response.ok) {
        const data = await response.json();
        setAllFeedback(data.feedback || []);
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    }
  };

  // Fetch user's feedback
  const fetchUserFeedback = async () => {
    if (!token) {
      setUserFeedback(null);
      return;
    }

    try {
      const response = await fetch('/api/feedback/my', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserFeedback(data.feedback);
      }
    } catch (error) {
      console.error('Failed to fetch user feedback:', error);
    }
  };

  // Load feedback on mount and when user changes
  useEffect(() => {
    const loadFeedback = async () => {
      setIsLoadingFeedback(true);
      await Promise.all([fetchAllFeedback(), fetchUserFeedback()]);
      setIsLoadingFeedback(false);
    };
    loadFeedback();
  }, [user, token]);

  const handleFeedbackSuccess = () => {
    fetchAllFeedback();
    fetchUserFeedback();
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
            Gridfinity Extended Generator
          </h1>
          <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-300 mb-8 max-w-3xl mx-auto">
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
              className="px-8 py-4 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-semibold text-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
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
      <section className="py-16 px-6 bg-white dark:bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">What is Gridfinity?</h2>
          <div className="prose prose-invert dark:prose-invert max-w-none">
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              Gridfinity is an open-source modular organization system created by{' '}
              <a
                href="https://www.youtube.com/watch?v=ra_9zU-mnl8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                Zack Freedman
              </a>
              . It's designed around a standardized grid unit (42×42×7 mm) so that bins, trays, baseplates, 
              and lids can all snap together in a modular grid system. The design philosophy emphasizes 
              visibility, accessibility, efficiency, and freeing up time to build projects rather than hunt for tools.
            </p>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
              Components are mostly 3D printable using FDM (Fused Deposition Modeling) printers, and there's 
              a thriving community producing compatible bins, lids, and accessories. Baseplates form the foundation 
              of the system, providing the grid structure that everything else connects to.
            </p>
          </div>
        </div>
      </section>

      {/* What is Gridfinity Extended */}
      <section className="py-16 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">What is Gridfinity Extended?</h2>
          <div className="prose prose-invert dark:prose-invert max-w-none">
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              <strong className="text-slate-900 dark:text-white">Gridfinity Extended</strong> is an OpenSCAD-based extension of the 
              original Gridfinity system, maintained by{' '}
              <a
                href="https://github.com/ostat/gridfinity_extended_openscad"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                ostat
              </a>
              . It takes the core Gridfinity library and adds{' '}
              <strong className="text-slate-900 dark:text-white">greatly expanded customization options</strong> that the community 
              has been asking for.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              Key features of Gridfinity Extended include:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mb-4">
              <li><strong className="text-slate-900 dark:text-white">Wall Patterns:</strong> Brick, sieve, and decorative patterns for bin walls</li>
              <li><strong className="text-slate-900 dark:text-white">Wall Cutouts:</strong> Custom cutouts on any side for easy access</li>
              <li><strong className="text-slate-900 dark:text-white">Fractional Unit Sizes:</strong> Half-grid sizes (21mm) and custom dimensions for odd spaces</li>
              <li><strong className="text-slate-900 dark:text-white">Sliding Lids:</strong> Optional sliding lids for bins</li>
              <li><strong className="text-slate-900 dark:text-white">Dividers & Trays:</strong> Internal compartment dividers and tray extensions</li>
              <li><strong className="text-slate-900 dark:text-white">Split Baseplates:</strong> Large baseplates can be split for easier printing</li>
              <li><strong className="text-slate-900 dark:text-white">Magnet & Screw Mounts:</strong> Various mounting options for baseplates</li>
              <li><strong className="text-slate-900 dark:text-white">Custom Labels:</strong> Label tabs on multiple sides</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
              The project is open-source, maintained under GPL-3.0, and provides both an{' '}
              <a
                href="https://makerworld.com/en/models/481168-gridfinity-extended"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                online customizer via MakerWorld
              </a>
              {' '}and downloadable OpenSCAD scripts for local use.
            </p>
          </div>
        </div>
      </section>

      {/* Our Project */}
      <section className="py-16 px-6 bg-white dark:bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Our Project</h2>
          <div className="prose prose-invert dark:prose-invert max-w-none">
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-4">
              This <strong className="text-slate-900 dark:text-white">Gridfinity Extended Generator</strong> builds directly on top of 
              Gridfinity Extended, providing an enhanced web interface with improved usability and additional features. 
              Our project is based on the{' '}
              <a
                href="https://github.com/new-usemame/Gridfinity_Extended_Generator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
              >
                Gridfinity Extended Generator repository
              </a>
              .
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-4">
              What makes our generator unique:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2 mb-4">
              <li><strong className="text-slate-900 dark:text-white">Comprehensive Documentation:</strong> Detailed explanations of Gridfinity Extended and all features</li>
              <li><strong className="text-slate-900 dark:text-white">Real-time 3D Preview:</strong> See your designs before generating STL files</li>
              <li><strong className="text-slate-900 dark:text-white">Server Generation:</strong> Fast server-side generation for all models</li>
              <li><strong className="text-slate-900 dark:text-white">All Extended Features:</strong> Full support for fractional sizes, wall cutouts, patterns, and more</li>
              <li><strong className="text-slate-900 dark:text-white">Better UX:</strong> Intuitive interface with clear explanations and tooltips</li>
              <li><strong className="text-slate-900 dark:text-white">Donation Support:</strong> Built-in crypto donation system to support development</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-6">
              We're not reinventing the wheel—we're making Gridfinity Extended more accessible and easier to use 
              while maintaining full compatibility with the original system.
            </p>
            
            {/* Contribute Section */}
            <div className="mt-8 p-6 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-slate-700 dark:text-slate-300 text-lg mb-4">
                Please contribute to help improve this project!
              </p>
              <a
                href="https://github.com/new-usemame/Gridfinity_Extended_Generator"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-slate-600 transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Key Advantages */}
      <section className="py-16 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Why Choose Our Generator?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Fractional Unit Support</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Many generators only support whole grid units. We support fractional sizes (0.5, 1.5, etc.) 
                and custom dimensions, giving you flexibility to fit odd spaces.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Wall Cutouts</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Add custom cutouts on any side of your bins for easy access. This feature is rare in other 
                generators but essential for many use cases.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Wall Patterns</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Customize your bins with decorative wall patterns including brick, sieve, and other styles 
                to match your aesthetic preferences.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Split Baseplates</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Large baseplates can be automatically split into smaller segments for easier printing on 
                smaller print beds, with connectors included.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16 px-6 bg-white dark:bg-slate-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Ready to Get Started?</h2>
          <p className="text-slate-700 dark:text-slate-300 text-lg mb-8">
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

      {/* Feedback Section */}
      <section className="py-16 px-6 bg-white dark:bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Feedback</h2>
          
          {/* Write/Edit Feedback Section */}
          <div className="mb-8">
            {user ? (
              userFeedback ? (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsFeedbackModalOpen(true)}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold hover:from-green-500 hover:to-green-400 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
                  >
                    Edit Feedback
                  </button>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    You've already submitted feedback. Click to edit it.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold hover:from-green-500 hover:to-green-400 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
                >
                  Write Feedback
                </button>
              )
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold hover:from-green-500 hover:to-green-400 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
                >
                  Write Feedback
                </button>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Please sign in to submit feedback.
                </p>
              </div>
            )}
          </div>

          {/* All Feedback Display */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">All Feedback</h3>
            {isLoadingFeedback ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 dark:border-green-400"></div>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Loading feedback...</p>
              </div>
            ) : allFeedback.length === 0 ? (
              <div className="text-center py-8 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-400">No feedback yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              allFeedback.map((feedback) => (
                <div
                  key={feedback.id}
                  className="bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{feedback.title}</h4>
                    {user && userFeedback && feedback.id === userFeedback.id && (
                      <button
                        onClick={() => setIsFeedbackModalOpen(true)}
                        className="px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    )}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-3">{feedback.content}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">{formatDate(feedback.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Comparison Teaser */}
      <section className="py-16 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">How We Compare</h2>
          <p className="text-slate-700 dark:text-slate-300 text-lg mb-6">
            There are several Gridfinity generators available, each with their strengths. While we may have 
            come later to the scene, we include many critical features that others are missing, such as 
            fractional unit support, wall cutouts, and comprehensive documentation.
          </p>
          <Link
            to="/comparison"
            className="inline-block px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
          >
            See Full Comparison →
          </Link>
        </div>
      </section>

      {/* Modals */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        initialData={userFeedback}
        onSuccess={handleFeedbackSuccess}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
