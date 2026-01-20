
interface SavePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onSignIn: () => void;
  isUserSignedIn: boolean;
}

export function SavePromptModal({ isOpen, onClose, onSave, onSignIn, isUserSignedIn }: SavePromptModalProps) {
  if (!isOpen) return null;

  const handleSave = () => {
    onSave();
    onClose();
  };

  const handleSignIn = () => {
    onSignIn();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Save Configuration?
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Do you want to save this configuration for later use?
        </p>
        <div className="flex gap-2">
          {isUserSignedIn ? (
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 hover:from-green-500 hover:to-green-400 dark:hover:from-green-400 dark:hover:to-green-300 text-white rounded-xl font-medium transition-all"
            >
              Save
            </button>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400 hover:from-green-500 hover:to-green-400 dark:hover:from-green-400 dark:hover:to-green-300 text-white rounded-xl font-medium transition-all"
            >
              Sign In to Save
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-medium transition-all"
          >
            No Thanks
          </button>
        </div>
      </div>
    </div>
  );
}
