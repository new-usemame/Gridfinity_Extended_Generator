export interface CryptoCurrency {
  name: string;
  symbol: string;
  address: string;
  network?: string;
}

export const CRYPTO_ADDRESSES: CryptoCurrency[] = [
  {
    name: 'Bitcoin',
    symbol: 'BTC',
    address: 'bc1q75k2nda83uxeuylsly4x2u0almp66r8a34tpgg',
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    address: '0x5D6cF19833c549831902Cf59E10a7436893A840f',
  },
  {
    name: 'Solana',
    symbol: 'SOL',
    address: 'CWmfstD3Nsfa1DeNXxMowZayY7pMzxTMuVY1qKNDroN9',
  },
  {
    name: 'Base',
    symbol: 'BASE',
    address: '0x5D6cF19833c549831902Cf59E10a7436893A840f',
    network: 'Base',
  },
  {
    name: 'BNB Chain',
    symbol: 'BNB',
    address: '0x5D6cF19833c549831902Cf59E10a7436893A840f',
    network: 'BNB Chain',
  },
  {
    name: 'Polygon',
    symbol: 'MATIC',
    address: '0x5D6cF19833c549831902Cf59E10a7436893A840f',
    network: 'Polygon',
  },
];

// Quick access for banner buttons (BTC, ETH, SOL)
export const QUICK_CRYPTO = CRYPTO_ADDRESSES.slice(0, 3);
