import { useState } from 'react';
import { QUICK_CRYPTO } from '../../config/crypto';
import { DonationModal } from '../DonationModal/DonationModal';

export function DonationBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleDonateModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-green-600/20 to-cyan-600/20 border-b border-green-500/30">
        <div className="px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-slate-300">Support this project</span>
          </div>
          <div className="flex items-center gap-2">
            {QUICK_CRYPTO.map((crypto) => (
              <button
                key={crypto.symbol}
                onClick={toggleDonateModal}
                className="px-3 py-1 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                {crypto.symbol}
              </button>
            ))}
            <button
              onClick={toggleDonateModal}
              className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-xs font-medium text-green-400 hover:text-green-300 transition-colors"
            >
              Donate
            </button>
          </div>
        </div>
      </div>
      <DonationModal isOpen={isModalOpen} onClose={toggleDonateModal} />
    </>
  );
}
