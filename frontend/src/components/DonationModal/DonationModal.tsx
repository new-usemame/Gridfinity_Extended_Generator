import { useState } from 'react';
import { CRYPTO_ADDRESSES } from '../../config/crypto';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const copyAddr = async (address: string, symbol: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(symbol);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleQR = (symbol: string) => {
    setShowQR((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  const getQRCodeUrl = (address: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Support This Project</h2>
          <button
            onClick={onClose}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-700 dark:text-slate-300 mb-6">
            If you find this tool helpful, your support goes a long way. You can donate via the following cryptocurrencies. 
            Feel free to scan QR codes or click to copy the address.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CRYPTO_ADDRESSES.map((crypto) => (
              <div
                key={crypto.symbol}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {crypto.name}
                    </h3>
                    {crypto.network && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">{crypto.network}</p>
                    )}
                  </div>
                  <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                    {crypto.symbol}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={crypto.address}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-300"
                    />
                    <button
                      onClick={() => copyAddr(crypto.address, crypto.symbol)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        copiedAddress === crypto.symbol
                          ? 'bg-green-600 dark:bg-green-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {copiedAddress === crypto.symbol ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <button
                    onClick={() => toggleQR(crypto.symbol)}
                    className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    {showQR[crypto.symbol] ? 'Hide QR Code' : 'Show QR Code'}
                  </button>

                  {showQR[crypto.symbol] && (
                    <div className="flex justify-center pt-2">
                      <img
                        src={getQRCodeUrl(crypto.address)}
                        alt={`QR code for ${crypto.name} address`}
                        className="bg-white p-2 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-slate-300">Why donations matter:</strong> Your support helps fund hosting, 
              development, new features, and keeps this tool free and accessible for everyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
