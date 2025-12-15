const { ethers } = require('ethers');
const poolConfig = require('../config/pools');

/**
 * Calldata Encoder - Generates base calldata for all swap methods
 * Dynamically creates calldata based on pool configurations
 */
class CalldataEncoder {
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
   */
  static encodeDagSwapByOrderId(chain, swapType, blockNumber = 'latest') {
    const config = poolConfig.pools[chain];
    const amounts = config.amounts[swapType];
    const dagSwap = config.dagSwap;

    if (!dagSwap) {
      throw new Error(`No dagSwap configuration for chain ${chain}`);
    }

    // Determine from/to tokens based on swap type
    // For dagSwap:
    // - BaseRequest.fromToken: uint256 token address (use _ETH for ETH input)
    // - RouterPath.fromToken: uint256 token address (always use actual token, WETH for ETH)
    let fromTokenAddr, toTokenAddr, routeFromToken;

    if (swapType === 'ERC20->ERC20') {
      fromTokenAddr = config.usdc;
      toTokenAddr = config.weth;
      routeFromToken = config.usdc;
    } else if (swapType === 'ETH->ERC20') {
      fromTokenAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // _ETH constant
      toTokenAddr = config.usdc;
      routeFromToken = config.weth; // RouterPath.fromToken uses WETH
    } else { // ERC20->ETH
      fromTokenAddr = config.usdc;
      toTokenAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // _ETH for native ETH output
      routeFromToken = config.usdc;
    }

    // Convert to BigInt for RouterPath.fromToken (uint256)
    const fromToken = BigInt(routeFromToken);
    const toToken = toTokenAddr;

    // Determine swap direction (reverse flag)
    // For UniswapV2-style pools: reverse = true if swapping token1 -> token0
    const isReverse = (swapType === 'ERC20->ERC20' || swapType === 'ERC20->ETH') &&
                     dagSwap.token1.toLowerCase() === config.usdc.toLowerCase();

    // Pack pool parameter with flags
    // From CommonUtils.sol masks:
    // Bit 255: REVERSE_MASK (set if reverse)
    // Bits 184-191: OUTPUT_INDEX (typically 1 for output token)
    // Bits 176-183: INPUT_INDEX (typically 0 for input token)
    // Bits 160-175: WEIGHT (10000 = 0x2710)
    // Bits 0-159: pool address (20 bytes)
    let poolPacked = BigInt(dagSwap.pool);

    if (isReverse) {
      poolPacked |= (BigInt(1) << BigInt(255)); // Set REVERSE_MASK
    }

    // Set weight to 10000 (0x2710) at bits 160-175
    poolPacked |= (BigInt(0x2710) << BigInt(160));

    // Set inputIndex (0) at bits 184-191
    poolPacked |= (BigInt(0x00) << BigInt(184));

    // Set outputIndex (1) at bits 176-183
    poolPacked |= (BigInt(0x01) << BigInt(176));

    // Deadline (current timestamp + 1 hour)
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Build route
    // RouterPath structure from IDexRouter.sol:
    // struct RouterPath {
    //     address[] mixAdapters;
    //     address[] assetTo;
    //     uint256[] rawData;     // Packed pool data goes here!
    //     bytes[] extraData;
    //     uint256 fromToken;
    // }
    const route = {
      mixAdapters: [dagSwap.adapter],
      assetTo: [dagSwap.pool], // Pool address (not packed)
      rawData: ['0x' + poolPacked.toString(16).padStart(64, '0')], // Packed pool with flags
      extraData: ['0x00'],
      fromToken: '0x' + fromToken.toString(16).padStart(64, '0') // uint256 fromToken
    };

    // Function selector
    const selector = '0xf2c42696';

    // NOTE: ethers v5 uses ethers.utils.defaultAbiCoder (v6 uses ethers.AbiCoder.defaultAbiCoder()).
    const abiCoder = ethers.utils.defaultAbiCoder;

    // dagSwapByOrderId parameters:
    // uint256 orderId, address fromToken, address toToken, uint256 amount,
    // uint256 minReturn, uint256 deadline, RouterPath[] routes
    const params = abiCoder.encode(
      ['uint256', 'address', 'address', 'uint256', 'uint256', 'uint256', 'tuple(address[],address[],uint256[],bytes[],uint256)[]'],
      [
        1, // orderId
        fromTokenAddr, // Use address for BaseRequest
        toToken,       // Use address for BaseRequest
        amounts.fromAmount,
        amounts.minReturn,
        deadline,
        [[
          route.mixAdapters,
          route.assetTo,
          route.rawData,
          route.extraData,
          route.fromToken // uint256 in RouterPath
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
        adapter: dagSwap.adapter,
        pool: dagSwap.pool,
        fromToken: amounts.fromToken,
        toToken: amounts.toToken,
        amount: amounts.fromAmount
      }
    };
  }

  /**
   * Generate calldata for specific method, chain, and swap type
   */
  static generate(method, chain, swapType, blockNumber = 'latest') {
    if (!poolConfig.pools[chain]) {
      throw new Error(`Chain ${chain} not configured in poolConfig`);
    }

    switch (method) {
      case 'uniswapV3':
        return this.encodeUniswapV3SwapTo(chain, swapType, blockNumber);
      case 'unxSwap':
        return this.encodeUnxswapByOrderId(chain, swapType, blockNumber);
      case 'dagSwap':
        return this.encodeDagSwapByOrderId(chain, swapType, blockNumber);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  /**
   * Generate all swap types for a method and chain
   */
  static generateAllSwapTypes(method, chain, blockNumber = 'latest') {
    const swapTypes = ['ERC20->ERC20', 'ETH->ERC20', 'ERC20->ETH'];
    const results = {};

    for (const swapType of swapTypes) {
      results[swapType] = this.generate(method, chain, swapType, blockNumber);
    }

    return results;
  }
}

// CLI interface
if (require.main === module) {
  console.log('=== Calldata Encoder Test ===\n');

  const chain = 'arb';
  const method = 'uniswapV3';
  const swapType = 'ERC20->ERC20';

  console.log(`Chain: ${chain}`);
  console.log(`Method: ${method}`);
  console.log(`Swap Type: ${swapType}\n`);

  try {
    const result = CalldataEncoder.generate(method, chain, swapType);

    console.log('Generated Calldata:');
    console.log('  Calldata:', result.calldata.slice(0, 66) + '...');
    console.log('  Length:', result.calldata.length, 'chars');
    console.log('  From:', result.from);
    console.log('  Value:', result.value);
    console.log('\nMetadata:');
    console.log(JSON.stringify(result.metadata, null, 2));

    // Generate all swap types
    console.log('\n=== All Swap Types ===\n');
    const allResults = CalldataEncoder.generateAllSwapTypes(method, chain);

    for (const [type, data] of Object.entries(allResults)) {
      console.log(`${type}:`);
      console.log(`  Calldata: ${data.calldata.slice(0, 66)}...`);
      console.log(`  Length: ${data.calldata.length} chars`);
      console.log(`  Value: ${data.value}\n`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = CalldataEncoder;

