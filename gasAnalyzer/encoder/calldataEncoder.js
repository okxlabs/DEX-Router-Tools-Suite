const { ethers } = require('ethers');
const poolConfig = require('../config/pools');
const { fetchUniV2PoolInfo, fetchUniV3PoolInfo } = require('../utils/fetchPoolInfo');

/**
 * Calldata Encoder - Generates base calldata for all swap methods
 * Dynamically creates calldata based on pool configurations
 * 
 * Pool token0/token1 are fetched from chain if not provided in config
 */
class CalldataEncoder {
  // Cache for fetched pool info to avoid repeated RPC calls
  static _poolInfoCache = {};

  /**
   * Get pool info, either from config or fetched from chain
   */
  static async _getPoolInfo(chain, poolAddress, poolType) {
    const cacheKey = `${chain}:${poolAddress}`;
    
    if (this._poolInfoCache[cacheKey]) {
      return this._poolInfoCache[cacheKey];
    }

    console.log(`Fetching pool info from chain: ${poolAddress}`);
    
    let info;
    if (poolType === 'uniswapV3') {
      info = await fetchUniV3PoolInfo(chain, poolAddress);
    } else {
      info = await fetchUniV2PoolInfo(chain, poolAddress);
    }
    
    this._poolInfoCache[cacheKey] = info;
    return info;
  }
  /**
   * Encode uniswapV3SwapTo calldata
   */
  static encodeUniswapV3SwapTo(chain, swapType, blockNumber = 'latest') {
    const config = poolConfig.pools[chain];

    if (!config) {
      throw new Error(`Chain ${chain} not found in poolConfig.pools`);
    }

    if (!config.amounts) {
      throw new Error(`No amounts configured for chain ${chain}`);
    }

    const amounts = config.amounts[swapType];

    if (!amounts) {
      throw new Error(`No amounts configured for swapType ${swapType} on chain ${chain}. Available: ${Object.keys(config.amounts).join(', ')}`);
    }

    const pool = config.uniswapV3;

    // Determine swap direction
    const isUSDCtoWETH = swapType === 'ERC20->ERC20' || swapType === 'ERC20->ETH';
    const isWETHtoUSDC = swapType === 'ETH->ERC20';

    // For uniswapV3, isOneForZero determines swap direction
    // isOneForZero = true means swapping token1 -> token0
    // isOneForZero = false means swapping token0 -> token1
    let isOneForZero;

    if (swapType === 'ERC20->ERC20' || swapType === 'ERC20->ETH') {
      // USDC -> WETH
      // If USDC is token1, we're swapping token1 -> token0, so isOneForZero = true
      isOneForZero = pool.token1.toLowerCase() === config.usdc.toLowerCase();
    } else {
      // WETH -> USDC
      // If WETH is token1, we're swapping token1 -> token0, so isOneForZero = true
      isOneForZero = pool.token1.toLowerCase() === config.weth.toLowerCase();
    }

    // Encode receiver as packed uint256
    // The receiver has a flag in the upper bits and address in lower bits
    // Based on actual calldata: 0x000000000000000000000001 + address
    // This means bit 160 is set (the bit just above the address space)
    let receiverPacked = BigInt(poolConfig.defaultFrom);
    receiverPacked |= (BigInt(1) << BigInt(160)); // Set bit 160

    // Encode pool as packed uint256
    let poolPacked = BigInt(pool.pool);
    if (isOneForZero) {
      poolPacked |= (BigInt(1) << BigInt(255)); // Set _ONE_FOR_ZERO_MASK (bit 255)
    }

    // For ERC20->ETH, set WETH unwrap flag so output is ETH instead of WETH
    if (swapType === 'ERC20->ETH') {
      poolPacked |= (BigInt(1) << BigInt(253)); // Set _WETH_UNWRAP_MASK (bit 253)
    }

    // Function selector
    const selector = '0x0d5f0e3b';

    // ABI encode parameters
    // NOTE: ethers v5 uses ethers.utils.defaultAbiCoder (v6 uses ethers.AbiCoder.defaultAbiCoder()).
    const abiCoder = ethers.utils.defaultAbiCoder;

    // Parameters: receiver (uint256), amount (uint256), minReturn (uint256), pools (uint256[])
    const params = abiCoder.encode(
      ['uint256', 'uint256', 'uint256', 'uint256[]'],
      [
        '0x' + receiverPacked.toString(16).padStart(64, '0'),
        amounts.fromAmount,
        amounts.minReturn,
        ['0x' + poolPacked.toString(16).padStart(64, '0')]
      ]
    );

    const calldata = selector + params.slice(2);

    return {
      calldata,
      from: poolConfig.defaultFrom,
      to: null, // Will be set by chain config
      value: swapType === 'ETH->ERC20' ? '0x' + BigInt(amounts.fromAmount).toString(16) : '0x0',
      blockNumber,
      metadata: {
        method: 'uniswapV3SwapTo',
        swapType,
        pool: pool.pool,
        fromToken: amounts.fromToken,
        toToken: amounts.toToken,
        amount: amounts.fromAmount,
        isOneForZero
      }
    };
  }

  /**
   * Encode unxswapByOrderId calldata (uses UniswapV2-style pools)
   */
  static encodeUnxswapByOrderId(chain, swapType, blockNumber = 'latest') {
    const config = poolConfig.pools[chain];
    const amounts = config.amounts[swapType];
    const pool = config.uniswapV2;

    // srcToken encoding (packed uint256)
    // Upper bits (160-255): Order ID
    // Lower bits (0-159): fromToken address
    // Special case: For ETH, use address(0) instead of 0xEeee...
    // Contract validation: (srcTokenAddr == fromToken) || (srcTokenAddr == address(0) && fromToken == _ETH)

    // Determine the srcToken address
    let srcTokenAddress;
    if (amounts.fromToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      // For ETH, use address(0) as per contract logic
      srcTokenAddress = BigInt(0);
    } else {
      // For ERC20 tokens, use actual token address
      srcTokenAddress = BigInt(amounts.fromToken);
    }

    // Add order ID in upper bits (using 0x01 as default order ID)
    const orderId = BigInt(1);
    let srcToken = srcTokenAddress | (orderId << BigInt(160));

    // Determine swap direction and flags
    // Pool: token0=WETH, token1=USDC
    //
    // Path format (from working calldata):
    //   byte 0: flags (c0 = REVERSE+WETH, 80 = REVERSE only, 00 = no flags)
    //   bytes 1-11: padding (000000000000)
    //   bytes 12-15: fee info (003b6d03)
    //   byte 16: marker (40)
    //   bytes 17-36: pool address (20 bytes)
    //
    // This is NOT a simple bytes32 with bit flags! It's a custom packed format.

    const poolAddress = pool.pool.toLowerCase().replace('0x', '');

    let flagByte;
    if (swapType === 'ERC20->ETH') {
      // USDC->WETH with unwrap to ETH
      flagByte = 'c0';
    } else if (swapType === 'ERC20->ERC20') {
      // USDC->WETH without unwrap
      flagByte = '80';
    } else {
      // ETH->ERC20: WETH->USDC, no special handling
      flagByte = '00';
    }

    // Use the exact format from working calldata
    const pathContent = flagByte + '000000000000' + '003b6d03' + '40' + poolAddress;

    // Function selector
    const selector = '0x9871efa4';

    // Manually construct calldata because path has special encoding
    // Params: uint256 srcToken, uint256 amount, uint256 minReturn, bytes path
    const srcTokenHex = srcToken.toString(16).padStart(64, '0');
    const amountHex = BigInt(amounts.fromAmount).toString(16).padStart(64, '0');
    const minReturnHex = BigInt(amounts.minReturn).toString(16).padStart(64, '0');

    // Path offset = 0x80 (128 bytes = 4 params * 32 bytes)
    const pathOffset = '0000000000000000000000000000000000000000000000000000000000000080';

    // Path: length (1) + content (32 bytes)
    const pathLength = '0000000000000000000000000000000000000000000000000000000000000001';
    const pathData = pathContent.padEnd(64, '0');

    const calldata = selector + srcTokenHex + amountHex + minReturnHex + pathOffset + pathLength + pathData;

    return {
      calldata,
      from: poolConfig.defaultFrom,
      to: null,
      value: swapType === 'ETH->ERC20' ? '0x' + BigInt(amounts.fromAmount).toString(16) : '0x0',
      blockNumber,
      metadata: {
        method: 'unxswapByOrderId',
        swapType,
        pool: pool.pool,
        fromToken: amounts.fromToken,
        toToken: amounts.toToken,
        amount: amounts.fromAmount
      }
    };
  }

  /**
   * Encode dagSwapByOrderId calldata
   * Supports both UniswapV2 and UniswapV3 style pools
   * 
   * @param {string} chain - Chain identifier
   * @param {string} swapType - 'ERC20->ERC20' | 'ETH->ERC20' | 'ERC20->ETH'
   * @param {string} blockNumber - Block number or 'latest'
   * @param {string} poolTypeKey - 'uniV2' (default) or 'uniV3'
   */
  static async encodeDagSwapByOrderId(chain, swapType, blockNumber = 'latest', poolTypeKey = 'uniV2') {
    const config = poolConfig.pools[chain];
    const amounts = config.amounts[swapType];
    
    if (!config.dagSwap) {
      throw new Error(`No dagSwap configuration for chain ${chain}`);
    }
    
    const dagSwap = config.dagSwap[poolTypeKey];
    if (!dagSwap) {
      throw new Error(`No dagSwap.${poolTypeKey} configuration for chain ${chain}. Available: ${Object.keys(config.dagSwap).join(', ')}`);
    }

    // Map poolTypeKey to poolType for internal use
    const poolType = poolTypeKey === 'uniV3' ? 'uniswapV3' : 'uniswapV2';

    // Fetch pool info from chain if token0/token1 not in config
    let poolInfo = dagSwap;
    if (!dagSwap.token0 || !dagSwap.token1) {
      const chainPoolInfo = await this._getPoolInfo(chain, dagSwap.pool, poolType);
      // Merge: config values take priority over fetched values
      poolInfo = { ...chainPoolInfo, ...dagSwap };
    }

    // Determine from/to tokens based on swap type
    let fromTokenAddr, toTokenAddr, routeFromToken, routeToToken;

    if (poolType === 'uniswapV3') {
      // For UniV3 WETH-USDC pool: token0=WETH, token1=USDC
      // Determine fromToken/toToken based on swapType
      if (swapType === 'ERC20->ERC20') {
        // USDC -> WETH (token1 -> token0)
        fromTokenAddr = poolInfo.token1;  // USDC
        toTokenAddr = poolInfo.token0;    // WETH
        routeFromToken = poolInfo.token1;
        routeToToken = poolInfo.token0;
      } else if (swapType === 'ETH->ERC20') {
        // ETH -> USDC: wrap ETH to WETH, swap WETH -> USDC
        fromTokenAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        toTokenAddr = poolInfo.token1;    // USDC (final output)
        routeFromToken = poolInfo.token0; // WETH (in pool)
        routeToToken = poolInfo.token1;   // USDC (in pool)
      } else { // ERC20->ETH
        // USDC -> ETH: swap USDC -> WETH, unwrap WETH to ETH
        fromTokenAddr = poolInfo.token1;  // USDC
        toTokenAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        routeFromToken = poolInfo.token1; // USDC (in pool)
        routeToToken = poolInfo.token0;   // WETH (in pool)
      }
    } else {
      // UniswapV2 style - use fetched pool token0/token1
      // token0 is typically the "lower" address, token1 the "higher"
      // For WETH-USDC pools: need to determine which is which
      if (swapType === 'ERC20->ERC20') {
        // USDC -> WETH (assuming USDC = token1, WETH = token0 in most pools)
        fromTokenAddr = config.usdc;
        toTokenAddr = config.weth;
        routeFromToken = config.usdc;
        routeToToken = config.weth;
      } else if (swapType === 'ETH->ERC20') {
        fromTokenAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        toTokenAddr = config.usdc;
        routeFromToken = config.weth;
        routeToToken = config.usdc;
      } else { // ERC20->ETH
        fromTokenAddr = config.usdc;
        toTokenAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        routeFromToken = config.usdc;
        routeToToken = config.weth;
      }
    }

    // Convert to BigInt for RouterPath.fromToken (uint256)
    const fromToken = BigInt(routeFromToken);
    const toToken = toTokenAddr;

    // Deadline (current timestamp + 1 hour)
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    let route;

    if (poolType === 'uniswapV3') {
      // UniswapV3 style encoding
      route = this._encodeUniV3DagSwapRoute(poolInfo, routeFromToken, routeToToken, fromToken);
    } else {
      // UniswapV2 style encoding
      route = this._encodeUniV2DagSwapRoute(poolInfo, config, routeFromToken, fromToken, swapType);
    }

    // Function selector
    const selector = '0xf2c42696';

    const abiCoder = ethers.utils.defaultAbiCoder;

    // dagSwapByOrderId parameters:
    // uint256 orderId, address fromToken, address toToken, uint256 amount,
    // uint256 minReturn, uint256 deadline, RouterPath[] routes
    const params = abiCoder.encode(
      ['uint256', 'address', 'address', 'uint256', 'uint256', 'uint256', 'tuple(address[],address[],uint256[],bytes[],uint256)[]'],
      [
        1, // orderId
        fromTokenAddr,
        toToken,
        amounts.fromAmount,
        amounts.minReturn,
        deadline,
        [[
          route.mixAdapters,
          route.assetTo,
          route.rawData,
          route.extraData,
          route.fromToken
        ]]
      ]
    );

    const calldata = selector + params.slice(2);

    return {
      calldata,
      from: poolConfig.defaultFrom,
      to: null,
      value: swapType === 'ETH->ERC20' ? '0x' + BigInt(amounts.fromAmount).toString(16) : '0x0',
      blockNumber,
      metadata: {
        method: 'dagSwapByOrderId',
        swapType,
        poolType,
        adapter: dagSwap.adapter,
        pool: dagSwap.pool,
        fromToken: fromTokenAddr,
        toToken: toTokenAddr,
        amount: amounts.fromAmount,
        poolInfo: {
          token0: poolInfo.token0,
          token1: poolInfo.token1,
          ...(poolType === 'uniswapV3' ? { fee: poolInfo.fee } : {})
        }
      }
    };
  }

  /**
   * Encode UniswapV2 style dagSwap route
   * 
   * @param {Object} poolInfo - Pool info with token0, token1 (fetched from chain if needed)
   * @param {Object} config - Chain pool config
   * @param {string} routeFromToken - From token address
   * @param {BigInt} fromToken - From token as BigInt
   * @param {string} swapType - Swap type
   */
  static _encodeUniV2DagSwapRoute(poolInfo, config, routeFromToken, fromToken, swapType) {
    // Determine swap direction (reverse flag)
    // For UniswapV2-style pools: reverse = true if swapping token1 -> token0
    // If routeFromToken == token1, we're doing token1 -> token0 (reverse)
    const isReverse = poolInfo.token1 && 
                     routeFromToken.toLowerCase() === poolInfo.token1.toLowerCase();

    // Pack pool parameter with flags
    let poolPacked = BigInt(poolInfo.pool);

    if (isReverse) {
      poolPacked |= (BigInt(1) << BigInt(255)); // Set REVERSE_MASK
    }

    // Set weight to 10000 (0x2710) at bits 160-175
    poolPacked |= (BigInt(0x2710) << BigInt(160));

    // Set inputIndex (0) at bits 184-191
    poolPacked |= (BigInt(0x00) << BigInt(184));

    // Set outputIndex (1) at bits 176-183
    poolPacked |= (BigInt(0x01) << BigInt(176));

    return {
      mixAdapters: [poolInfo.adapter],
      assetTo: [poolInfo.pool],
      rawData: ['0x' + poolPacked.toString(16).padStart(64, '0')],
      extraData: ['0x00'],
      fromToken: '0x' + fromToken.toString(16).padStart(64, '0')
    };
  }

  /**
   * Encode UniswapV3 style dagSwap route
   * 
   * Key differences from UniV2:
   * 1. assetTo = adapter address (not pool address)
   * 2. extraData = abi.encode(sqrtX96, abi.encode(fromToken, toToken))
   * 3. rawData still packs pool address with REVERSE flag
   * 
   * @param {Object} poolInfo - Pool info with token0, token1, fee (fetched from chain)
   */
  static _encodeUniV3DagSwapRoute(poolInfo, routeFromToken, routeToToken, fromToken) {
    const abiCoder = ethers.utils.defaultAbiCoder;

    // Determine swap direction for UniV3
    // zeroForOne = fromToken < toToken (comparing addresses)
    const fromTokenLower = routeFromToken.toLowerCase();
    const toTokenLower = routeToToken.toLowerCase();
    const zeroForOne = fromTokenLower < toTokenLower;

    // Pack pool parameter with flags
    // For UniV3: REVERSE = !zeroForOne (i.e., token1 -> token0)
    let poolPacked = BigInt(poolInfo.pool);

    if (!zeroForOne) {
      // If swapping token1 -> token0, set REVERSE flag
      poolPacked |= (BigInt(1) << BigInt(255));
    }

    // Set weight to 10000 (0x2710) at bits 160-175
    poolPacked |= (BigInt(0x2710) << BigInt(160));

    // Set inputIndex (0) at bits 184-191
    poolPacked |= (BigInt(0x00) << BigInt(184));

    // Set outputIndex (1) at bits 176-183
    poolPacked |= (BigInt(0x01) << BigInt(176));

    // Encode extraData for UniV3
    // From BaseUniversalUniswapV3Adapter._sell():
    //   (uint160 sqrtX96, bytes memory data) = abi.decode(moreInfo, (uint160, bytes))
    //   (address fromToken, address toToken) = abi.decode(data, (address, address))
    const sqrtX96 = poolInfo.sqrtPriceX96 || '0';
    const tokenData = abiCoder.encode(['address', 'address'], [routeFromToken, routeToToken]);
    const extraData = abiCoder.encode(['uint160', 'bytes'], [sqrtX96, tokenData]);

    return {
      mixAdapters: [poolInfo.adapter],
      assetTo: [poolInfo.adapter], // For UniV3, assetTo = adapter
      rawData: ['0x' + poolPacked.toString(16).padStart(64, '0')],
      extraData: [extraData],
      fromToken: '0x' + fromToken.toString(16).padStart(64, '0')
    };
  }

  /**
   * Generate calldata for specific method, chain, and swap type
   * 
   * @param {string} method - 'uniswapV3' | 'unxSwap' | 'dagSwap'
   * @param {string} chain - Chain identifier
   * @param {string} swapType - 'ERC20->ERC20' | 'ETH->ERC20' | 'ERC20->ETH'
   * @param {string} blockNumber - Block number or 'latest'
   * @param {Object} options - Optional settings
   * @param {string} options.poolType - 'uniV2' | 'uniV3' (for dagSwap, default: use env POOL_TYPE or 'uniV2')
   */
  static async generate(method, chain, swapType, blockNumber = 'latest', options = {}) {
    if (!poolConfig.pools[chain]) {
      throw new Error(`Chain ${chain} not configured in poolConfig`);
    }

    switch (method) {
      case 'uniswapV3':
        return this.encodeUniswapV3SwapTo(chain, swapType, blockNumber);
      case 'unxSwap':
        return this.encodeUnxswapByOrderId(chain, swapType, blockNumber);
      case 'dagSwap':
        // Determine pool type based on options or environment variable
        const poolTypeKey = options.poolType || process.env.POOL_TYPE || 'uniV2';
        return await this.encodeDagSwapByOrderId(chain, swapType, blockNumber, poolTypeKey);
      default:
        throw new Error(`Unknown method: ${method}. Available: uniswapV3, unxSwap, dagSwap`);
    }
  }

  /**
   * Generate all swap types for a method and chain
   */
  static async generateAllSwapTypes(method, chain, blockNumber = 'latest') {
    const swapTypes = ['ERC20->ERC20', 'ETH->ERC20', 'ERC20->ETH'];
    const results = {};

    for (const swapType of swapTypes) {
      results[swapType] = await this.generate(method, chain, swapType, blockNumber);
    }

    return results;
  }

  /**
   * Clear the pool info cache
   */
  static clearCache() {
    this._poolInfoCache = {};
  }
}

// CLI interface
if (require.main === module) {
  (async () => {
    console.log('=== Calldata Encoder Test ===\n');

    const chain = process.argv[2] || 'arb';
    const method = process.argv[3] || 'dagSwap';
    const swapType = process.argv[4] || 'ERC20->ERC20';

    console.log(`Chain: ${chain}`);
    console.log(`Method: ${method}`);
    console.log(`Swap Type: ${swapType}\n`);

    try {
      const result = await CalldataEncoder.generate(method, chain, swapType);

      console.log('Generated Calldata:');
      console.log('  Calldata:', result.calldata.slice(0, 66) + '...');
      console.log('  Full Length:', result.calldata.length, 'chars');
      console.log('  From:', result.from);
      console.log('  Value:', result.value);
      console.log('\nMetadata:');
      console.log(JSON.stringify(result.metadata, null, 2));

      // If dagSwap, show poolInfo
      if (result.metadata.poolInfo) {
        console.log('\nPool Info (fetched from chain):');
        console.log('  token0:', result.metadata.poolInfo.token0);
        console.log('  token1:', result.metadata.poolInfo.token1);
        if (result.metadata.poolInfo.fee) {
          console.log('  fee:', result.metadata.poolInfo.fee);
        }
      }

    } catch (error) {
      console.error('Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}

module.exports = CalldataEncoder;

