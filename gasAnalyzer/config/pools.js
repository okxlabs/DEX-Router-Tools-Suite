/**
 * Pool Configuration for each chain
 * Defines WETH-USDC pools for UniswapV2 and UniswapV3
 */
module.exports = {
  pools: {
    // Arbitrum One
    arb: {
      weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      usdc: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',

      // UniswapV3 Pool (WETH-USDC 0.05% fee)
      uniswapV3: {
        pool: '0xC6962004f452bE9203591991D15f6b388e09E8D0',
        fee: 500,
        token0: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
        token1: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
      },

      // UniswapV2 / UNX Pool (WETH-USDC)
      uniswapV2: {
        pool: '0xF64Dfe17C8b87F012FCf50FbDA1D62bfA148366a',
        token0: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
        token1: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
      },

      // DagSwap Adapter - supports both UniswapV2 and UniswapV3 pools
      // token0/token1 fetched dynamically from pool contract
      // Use POOL_TYPE env var or options.poolType to select: 'uniV2' | 'uniV3'
      dagSwap: {
        uniV2: {
          adapter: '0x808ca026D4c45d6A41c1e807c41044480b7699eF',
          pool: '0xF64Dfe17C8b87F012FCf50FbDA1D62bfA148366a',
        },
        uniV3: {
          adapter: '0x6747BcaF9bD5a5F0758Cbe08903490E45DdfACB5',
          pool: '0xC6962004f452bE9203591991D15f6b388e09E8D0',  // WETH-USDC 0.05%
          // sqrtPriceX96: set to 0 to use default (MIN/MAX based on direction)
          sqrtPriceX96: '0',
        },
      },

      // Test amounts
      amounts: {
        'ERC20->ERC20': {
          // 0.01 USDC (10000 wei, 6 decimals)
          fromAmount: '10000',
          fromToken: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
          toToken: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',   // WETH
          minReturn: '1'
        },
        'ETH->ERC20': {
          // 0.000001 ETH (1000000000000 wei)
          fromAmount: '1000000000000',
          fromToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH placeholder
          toToken: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',   // USDC
          minReturn: '1'
        },
        'ERC20->ETH': {
          // 0.01 USDC (10000 wei)
          fromAmount: '10000',
          fromToken: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
          toToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',   // ETH placeholder
          minReturn: '1'
        }
      }
    },

    // Ethereum Mainnet
    eth: {
      weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',

      uniswapV3: {
        pool: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', // USDC-WETH 0.05%
        fee: 500,
        token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      },

      uniswapV2: {
        pool: '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc', // USDC-WETH
        token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      },

      dagSwap: {
        uniV2: {
          adapter: '0xc837BbEa8C7b0caC0e8928f797ceB04A34c9c06e',
          pool: '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc',
        },
        uniV3: {
          adapter: '0x6747BcaF9bD5a5F0758Cbe08903490E45DdfACB5',
          pool: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',  // WETH-USDC 0.05%
          // sqrtPriceX96: set to 0 to use default (MIN/MAX based on direction)
          sqrtPriceX96: '0',
        },
      },

      amounts: {
        'ERC20->ERC20': {
          fromAmount: '10000',
          fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
          toToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',   // WETH
          minReturn: '1'
        },
        'ETH->ERC20': {
          fromAmount: '1000000000000',
          fromToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          toToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          minReturn: '1'
        },
        'ERC20->ETH': {
          fromAmount: '10000',
          fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          toToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          minReturn: '1'
        }
      }
    },

    // Base
    base: {
      weth: '0x4200000000000000000000000000000000000006',
      usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',

      uniswapV3: {
        pool: '0xd0b53D9277642d899DF5C87A3966A349A798F224', // WETH-USDC 0.05%
        fee: 500,
        token0: '0x4200000000000000000000000000000000000006', // WETH
        token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      },

      uniswapV2: {
        pool: '0x88A43bbDF9D098eEC7bCEda4e2494615dfD9bB9C', // Estimated
        token0: '0x4200000000000000000000000000000000000006', // WETH
        token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      },

      amounts: {
        'ERC20->ERC20': {
          fromAmount: '10000',
          fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          toToken: '0x4200000000000000000000000000000000000006',
          minReturn: '1'
        },
        'ETH->ERC20': {
          fromAmount: '1000000000000',
          fromToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          toToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          minReturn: '1'
        },
        'ERC20->ETH': {
          fromAmount: '10000',
          fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          toToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          minReturn: '1'
        }
      }
    },

    // BSC
    bsc: {
      weth: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',

      uniswapV3: {
        pool: '0x36696169C63e42cd08ce11f5deeBbCeBae652050', // Estimated
        fee: 500,
        token0: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
        token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      },

      uniswapV2: {
        pool: '0xd99c7F6C65857AC913a8f880A4cb84032AB2FC5b', // PancakeSwap
        token0: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
        token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      },

      amounts: {
        'ERC20->ERC20': {
          fromAmount: '10000',
          fromToken: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
          toToken: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
          minReturn: '1'
        },
        'ETH->ERC20': {
          fromAmount: '1000000000000',
          fromToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          toToken: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
          minReturn: '1'
        },
        'ERC20->ETH': {
          fromAmount: '10000',
          fromToken: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
          toToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          minReturn: '1'
        }
      }
    }
  },

  // Commission recipient addresses (for testing)
  commissionRecipients: {
    recipient1: '0x399efa78cacd7784751cd9fbf2523edf9efdf6ad',
    recipient2: '0x591342772bbc7d0630efbdea3c0b704e7addad17'
  },

  // Default from address for transactions
  defaultFrom: '0x358506b4c5c441873ade429c5a2be777578e2c6f'
};

