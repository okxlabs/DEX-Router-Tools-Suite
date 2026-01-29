// Direct JSON-RPC call using fetch (avoids ethers.js CORS issues)
async function rpcCall(rpcUrl, method, params = []) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }
  
  return data.result;
}

// Get block by number or tag
async function getBlock(rpcUrl, blockNumber) {
  const blockParam = typeof blockNumber === 'number' 
    ? '0x' + blockNumber.toString(16) 
    : blockNumber;
  
  const block = await rpcCall(rpcUrl, 'eth_getBlockByNumber', [blockParam, false]);
  
  if (!block) {
    throw new Error(`Block ${blockNumber} not found`);
  }
  
  return {
    number: parseInt(block.number, 16),
    hash: block.hash,
    timestamp: parseInt(block.timestamp, 16),
  };
}

export async function findBlockByTimestamp(rpcUrl, targetTimestamp, onProgress) {
  const latestBlock = await getBlock(rpcUrl, 'latest');
  const latestBlockNumber = latestBlock.number;
  const latestTimestamp = latestBlock.timestamp;

  if (targetTimestamp > latestTimestamp) {
    throw new Error(`Target timestamp ${targetTimestamp} is in the future, latest block timestamp is ${latestTimestamp}`);
  }

  const sampleSize = 100;
  const sampleBlock = await getBlock(rpcUrl, latestBlockNumber - sampleSize);
  const avgBlockTime = (latestTimestamp - sampleBlock.timestamp) / sampleSize;

  const timeDiff = latestTimestamp - targetTimestamp;
  const estimatedBlocksBack = Math.floor(timeDiff / avgBlockTime);
  
  let left = Math.max(0, latestBlockNumber - estimatedBlocksBack - 5000);
  let right = latestBlockNumber;
  let result = null;
  let iterations = 0;

  while (left <= right) {
    iterations++;
    const mid = Math.floor((left + right) / 2);
    const block = await getBlock(rpcUrl, mid);
    const blockTimestamp = block.timestamp;

    if (onProgress) {
      onProgress({ iteration: iterations, blockNumber: mid, timestamp: blockTimestamp });
    }

    if (blockTimestamp < targetTimestamp) {
      left = mid + 1;
    } else if (blockTimestamp > targetTimestamp) {
      right = mid - 1;
      result = block;
    } else {
      result = block;
      break;
    }
  }

  if (result === null) {
    result = await getBlock(rpcUrl, left);
  }

  return {
    blockNumber: result.number,
    blockHash: result.hash,
    timestamp: result.timestamp,
    iterations: iterations
  };
}
