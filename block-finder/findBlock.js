#!/usr/bin/env node
/**
 * Block Finder Tool
 * Find the closest block after a given timestamp (in seconds) via RPC
 */

require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

/**
 * Binary search to find the closest block after the specified timestamp
 * @param {ethers.providers.JsonRpcProvider} provider - RPC provider
 * @param {number} targetTimestamp - Target timestamp (seconds)
 * @returns {Promise<Object>} Block information
 */
async function findBlockByTimestamp(provider, targetTimestamp) {
  const targetTime = new Date(targetTimestamp * 1000);
  const utc8TargetTime = new Date(targetTime.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, ' UTC+8');
  
  console.error(`[SEARCH] Target timestamp: ${targetTimestamp} (${utc8TargetTime})`);
  
  // Get latest block
  console.error('[SEARCH] Fetching latest block...');
  const latestBlock = await provider.getBlock('latest');
  const latestBlockNumber = latestBlock.number;
  const latestTimestamp = latestBlock.timestamp;
  
  console.error(`[SEARCH] Latest block: #${latestBlockNumber}, timestamp: ${latestTimestamp}`);

  // Check if target time is in the future
  if (targetTimestamp > latestTimestamp) {
    throw new Error(`Target timestamp ${targetTimestamp} is in the future, latest block timestamp is ${latestTimestamp}`);
  }

  // Estimate average block time
  console.error('[SEARCH] Estimating average block time...');
  const sampleSize = 100;
  const sampleBlock = await provider.getBlock(latestBlockNumber - sampleSize);
  const avgBlockTime = (latestTimestamp - sampleBlock.timestamp) / sampleSize;
  console.error(`[SEARCH] Average block time: ${avgBlockTime.toFixed(2)} seconds`);

  // Estimate initial search range
  const timeDiff = latestTimestamp - targetTimestamp;
  const estimatedBlocksBack = Math.floor(timeDiff / avgBlockTime);
  
  let left = Math.max(0, latestBlockNumber - estimatedBlocksBack - 5000);
  let right = latestBlockNumber;
  let result = null;
  
  console.error(`[SEARCH] Search range: #${left} ~ #${right} (${right - left + 1} blocks)`);
  console.error('[SEARCH] Starting binary search...\n');

  let iterations = 0;
  // Binary search
  while (left <= right) {
    iterations++;
    const mid = Math.floor((left + right) / 2);
    const block = await provider.getBlock(mid);
    const timeDiffFromTarget = block.timestamp - targetTimestamp;
    const sign = timeDiffFromTarget >= 0 ? '+' : '';
    
    console.error(`[ITER ${iterations}] Block #${mid}, timestamp: ${block.timestamp}, diff: ${sign}${timeDiffFromTarget}s`);

    if (block.timestamp < targetTimestamp) {
      left = mid + 1;
    } else if (block.timestamp > targetTimestamp) {
      right = mid - 1;
      result = block;
    } else {
      // Exact match
      console.error(`[SEARCH] Exact match found!`);
      result = block;
      break;
    }
  }

  // Ensure we found the first block after the timestamp
  if (result === null) {
    result = await provider.getBlock(left);
  }
  
  console.error(`\n[SEARCH] Search completed in ${iterations} iterations`);
  console.error(`[RESULT] Found block #${result.number}, timestamp difference: +${result.timestamp - targetTimestamp}s\n`);

  return result;
}

/**
 * Main function
 */
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);

    if (args.length < 2) {
      console.error('Error: Please provide chain name and timestamp parameters');
      console.error('Usage: node findBlock.js <chain> <timestamp>');
      console.error('');
      console.error('Examples:');
      console.error('  node findBlock.js eth 1704067200');
      console.error('  node findBlock.js bsc 1704067200');
      console.error('  node findBlock.js arb 1704067200');
      console.error('');
      console.error('Supported chains: eth, bsc, arb, base, op, polygon, etc.');
      process.exit(1);
    }

    const chain = args[0].toLowerCase();
    let targetTimestamp = parseInt(args[1]);

    // Validate timestamp
    if (isNaN(targetTimestamp) || targetTimestamp <= 0) {
      console.error('Error: Invalid timestamp');
      process.exit(1);
    }

    // Automatically handle millisecond timestamps
    if (targetTimestamp > 10000000000) {
      targetTimestamp = Math.floor(targetTimestamp / 1000);
    }

    // Get RPC URL for the specified chain
    const envVarName = `${chain.toUpperCase()}_RPC_URL`;
    const rpcUrl = process.env[envVarName];
    
    if (!rpcUrl) {
      console.error(`Error: ${envVarName} environment variable not found`);
      console.error(`Please add ${envVarName} to your .env file in project root`);
      console.error('');
      console.error('Example .env file:');
      console.error('  ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY');
      console.error('  BSC_RPC_URL=https://bsc-dataseed.binance.org/');
      console.error('  ARB_RPC_URL=https://arb1.arbitrum.io/rpc');
      process.exit(1);
    }

    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // Find block
    const block = await findBlockByTimestamp(provider, targetTimestamp);

    // Output result (UTC+8 time)
    const date = new Date(block.timestamp * 1000);
    const utc8Time = new Date(date.getTime() + 8 * 60 * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace(/\.\d{3}Z$/, ' UTC+8');
    
    console.log(JSON.stringify({
      chain: chain,
      blockNumber: block.number,
      blockHash: block.hash,
      timestamp: block.timestamp,
      time: utc8Time,
      transactions: block.transactions.length
    }, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = { findBlockByTimestamp };

