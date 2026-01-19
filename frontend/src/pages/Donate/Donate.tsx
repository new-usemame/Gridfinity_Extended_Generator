import { useState } from 'react';
import { CRYPTO_ADDRESSES } from '../../config/crypto';

export function Donate() {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<Record<string, boolean>>({});

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
    <div className="min-h-screen py-16 px-6 bg-slate-950">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Support This Project</h1>
        <p className="text-xl text-slate-300 mb-8">
          If you enjoy using this Gridfinity Extended Generator and want to help make it better—faster updates, 
          more features, lower server costs—your donations are greatly appreciated.
        </p>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Why Donations Matter</h2>
          <ul className="space-y-2 text-slate-300">
            <li>• <strong className="text-white">Hosting costs:</strong> Keeping the server running and accessible</li>
            <li>• <strong className="text-white">Development time:</strong> Adding new features and fixing bugs</li>
            <li>• <strong className="text-white">Maintenance:</strong> Keeping the tool updated with latest Gridfinity Extended features</li>
            <li>• <strong className="text-white">Free access:</strong> Keeping the tool free and accessible for everyone</li>
          </ul>
        </div>

        <h2 className="text-2xl font-semibold text-white mb-6">Cryptocurrency Donations</h2>
        <p className="text-slate-300 mb-6">
          You can donate via any of the following cryptocurrencies. Click the address to copy it, or scan the 
          QR code with your wallet app.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {CRYPTO_ADDRESSES.map((crypto) => (
            <div
              key={crypto.symbol}
              className="bg-slate-800 border border-slate-700 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {crypto.name}
                  </h3>
                  {crypto.network && (
                    <p className="text-sm text-slate-400">{crypto.network}</p>
                  )}
                </div>
                <span className="text-sm font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded">
                  {crypto.symbol}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={crypto.address}
                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-slate-300"
                  />
                  <button
                    onClick={() => copyAddr(crypto.address, crypto.symbol)}
                    className={`px-6 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      copiedAddress === crypto.symbol
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {copiedAddress === crypto.symbol ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <button
                  onClick={() => toggleQR(crypto.symbol)}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                  {showQR[crypto.symbol] ? 'Hide QR Code' : 'Show QR Code'}
                </button>

                {showQR[crypto.symbol] && (
                  <div className="flex justify-center pt-2">
                    <img
                      src={getQRCodeUrl(crypto.address)}
                      alt={`QR code for ${crypto.name} address`}
                      className="bg-white p-3 rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Other Ways to Contribute</h2>
          <ul className="space-y-3 text-slate-300">
            <li>
              <strong className="text-white">Report Bugs:</strong> Found an issue? Report it on{' '}
              <a
                href="https://github.com/new-usemame/Gridfinity_Extended_Generator/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
              >
                GitHub Issues
              </a>
            </li>
            <li>
              <strong className="text-white">Request Features:</strong> Have an idea for a new feature? 
              Open a feature request on GitHub.
            </li>
            <li>
              <strong className="text-white">Share Your Prints:</strong> Show off what you've created! 
              Share photos of your Gridfinity setups.
            </li>
            <li>
              <strong className="text-white">Spread the Word:</strong> Tell others about this tool if 
              you find it useful.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
