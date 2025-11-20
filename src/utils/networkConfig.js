// Network configuration for blockchain networks and RPC endpoints

export const chainOptions = [
  { id: 'other', name: 'Custom Chain ID' },
  { id: '1', name: 'Ethereum Mainnet' },
  { id: '56', name: 'BSC' },
  { id: '8453', name: 'Base' },
  { id: '42161', name: 'Arbitrum One' },
  { id: '43114', name: 'Avalanche' }
];

export const rpcUrlOptions = [
  { id: 'custom', name: 'Custom RPC URL', url: '' },
  { id: 'eth-mainnet', name: 'Ethereum Mainnet', url: 'https://eth.llamarpc.com', chainId: '1' },
  { id: 'xlayer', name: 'X Layer', url: 'https://xlayer.drpc.org'},
  { id: 'bsc', name: 'BSC', url: 'https://bsc-dataseed.binance.org', chainId: '56' },
  { id: 'base', name: 'Base', url: 'https://mainnet.base.org', chainId: '8453' },
  { id: 'arbitrum', name: 'Arbitrum One', url: 'https://arb1.arbitrum.io/rpc', chainId: '42161' },
  { id: 'avalanche', name: 'Avalanche', url: 'https://api.avax.network/ext/bc/C/rpc', chainId: '43114' }
];

// Helper function to get chain name by ID
export const getChainNameById = (chainId) => {
  const chain = chainOptions.find(option => option.id === chainId);
  return chain ? chain.name : 'Unknown Network';
};

// Helper function to get RPC URL by chain ID
export const getRpcUrlByChainId = (chainId) => {
  const rpc = rpcUrlOptions.find(option => option.chainId === chainId);
  return rpc ? rpc.url : '';
};

// Helper function to get chain ID by RPC URL
export const getChainIdByRpcUrl = (url) => {
  const rpc = rpcUrlOptions.find(option => option.url === url);
  return rpc ? rpc.chainId : null;
};

