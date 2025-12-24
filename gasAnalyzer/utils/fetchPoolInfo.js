#!/usr/bin/env node
/**
 * Fetch pool information from chain
 * Automatically gets token0, token1, sqrtPriceX96 for UniV3 pools
 */

const { ethers } = require('ethers');
const config = require('../config/chains');

// UniswapV3 Pool ABI (minimal)
const UNIV3_POOL_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)',
  'function fee() external view returns (uint24)'
];

// UniswapV2 Pool ABI (minimal)
const UNIV2_POOL_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
];

/**
 * Fetch UniV3 pool info from chain
 */
async function fetchUniV3PoolInfo(chain, poolAddress) {
  const chainConfig = config.chains[chain];
  const provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
  
  const pool = new ethers.Contract(poolAddress, UNIV3_POOL_ABI, provider);
  
  console.log(`Fetching UniV3 pool info from ${chain}...`);
  console.log(`Pool: ${poolAddress}\n`);
  
  try {
    const [token0, token1, slot0, fee] = await Promise.all([
      pool.token0(),
      pool.token1(),
      pool.slot0(),
      pool.fee().catch(() => null) // Some pools don't have fee()
    ]);
    
    const info = {
      pool: poolAddress,
      token0: token0,
      token1: token1,
      sqrtPriceX96: slot0.sqrtPriceX96.toString(),
      tick: slot0.tick,
      fee: fee ? fee.toString() : 'unknown'
    };
    
    console.log('Pool Info:');
    console.log(`  token0: ${info.token0}`);
    console.log(`  token1: ${info.token1}`);
    console.log(`  sqrtPriceX96: ${info.sqrtPriceX96}`);
    console.log(`  tick: ${info.tick}`);
    console.log(`  fee: ${info.fee}`);
    
    return info;
  } catch (error) {
    console.error('Error fetching pool info:', error.message);
    throw error;
  }
}

/**
 * Fetch UniV2 pool info from chain
 */
async function fetchUniV2PoolInfo(chain, poolAddress) {
  const chainConfig = config.chains[chain];
  const provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
  
  const pool = new ethers.Contract(poolAddress, UNIV2_POOL_ABI, provider);
  
  console.log(`Fetching UniV2 pool info from ${chain}...`);
  console.log(`Pool: ${poolAddress}\n`);
  
  try {
    const [token0, token1, reserves] = await Promise.all([
      pool.token0(),
      pool.token1(),
      pool.getReserves()
    ]);
    
    const info = {
      pool: poolAddress,
      token0: token0,
      token1: token1,
      reserve0: reserves.reserve0.toString(),
      reserve1: reserves.reserve1.toString()
    };
    
    console.log('Pool Info:');
    console.log(`  token0: ${info.token0}`);
    console.log(`  token1: ${info.token1}`);
    console.log(`  reserve0: ${info.reserve0}`);
    console.log(`  reserve1: ${info.reserve1}`);
    
    return info;
  } catch (error) {
    console.error('Error fetching pool info:', error.message);
    throw error;
  }
}

/**
 * Generate pools.js config snippet for a UniV3 dagSwap pool
 */
async function generateUniV3DagSwapConfig(chain, adapterAddress, poolAddress) {
  const info = await fetchUniV3PoolInfo(chain, poolAddress);
  
  console.log('\n=== Generated Config ===\n');
  console.log(`dagSwapV3: {
  poolType: 'uniswapV3',
  adapter: '${adapterAddress}',
  pool: '${poolAddress}',
  token0: '${info.token0}',
  token1: '${info.token1}',
  // sqrtPriceX96 will be fetched dynamically, or use 0 for default
  sqrtPriceX96: '0', // Set to 0 to use MIN/MAX_SQRT_RATIO based on direction
},`);
  
  return {
    poolType: 'uniswapV3',
    adapter: adapterAddress,
    pool: poolAddress,
    token0: info.token0,
    token1: info.token1,
    sqrtPriceX96: '0'
  };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node fetchPoolInfo.js <chain> <poolType> <poolAddress> [adapterAddress]');
    console.log('');
    console.log('Pool Types: uniV2, uniV3');
    console.log('Chains:', Object.keys(config.chains).join(', '));
    console.log('');
    console.log('Examples:');
    console.log('  node fetchPoolInfo.js arb uniV3 0xaa89ba37d1975ae294974ebb33db9d4b5324f2f2');
    console.log('  node fetchPoolInfo.js arb uniV3 0xaa89ba37d1975ae294974ebb33db9d4b5324f2f2 0x6747BcaF9bD5a5F0758Cbe08903490E45DdfACB5');
    process.exit(1);
  }
  
  const [chain, poolType, poolAddress, adapterAddress] = args;
  
  (async () => {
    try {
      if (poolType === 'uniV3') {
        if (adapterAddress) {
          await generateUniV3DagSwapConfig(chain, adapterAddress, poolAddress);
        } else {
          await fetchUniV3PoolInfo(chain, poolAddress);
        }
      } else if (poolType === 'uniV2') {
        await fetchUniV2PoolInfo(chain, poolAddress);
      } else {
        console.error('Unknown pool type:', poolType);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchUniV3PoolInfo,
  fetchUniV2PoolInfo,
  generateUniV3DagSwapConfig
};

