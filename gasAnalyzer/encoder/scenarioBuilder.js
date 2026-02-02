const config = require('../config/chains');

/**
 * Scenario Builder - Generate specific calldata suffix for different test scenarios
 * Based on eth-gas-measurement project scenario design
 */
class ScenarioBuilder {

  /**
   * Extract fromToken and toToken addresses from calldata
   * For ETH-related scenarios, infer correct token address from swapType
   * @param {string} calldata - The base calldata
   * @param {string} swapType - Swap type
   * @param {string} chain - Chain identifier (default: 'arb')
   */
  static extractTokenAddresses(calldata, swapType, chain = 'arb') {
    const poolConfig = require('../config/pools');
    const poolCfg = poolConfig.pools[chain] || poolConfig.pools.arb;
    const ETH_ADDRESS = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    // For ETH-related scenarios, return correct token based on swapType
    // This ensures commission/trim uses correct token address
    if (swapType === 'ETH->ERC20') {
      // ETH -> USDC: fromToken=ETH, toToken=USDC
      return {
        fromToken: ETH_ADDRESS,
        toToken: poolCfg.usdc.toLowerCase().replace('0x', '')
      };
    } else if (swapType === 'ERC20->ETH') {
      // USDC -> ETH: fromToken=USDC, toToken=ETH (unwrapped)
      return {
        fromToken: poolCfg.usdc.toLowerCase().replace('0x', ''),
        toToken: ETH_ADDRESS
      };
    }

    // For ERC20->ERC20, extract from calldata or use default
    const selector = calldata.slice(0, 10);

    if (selector === '0xf2c42696') {
      // dagSwapByOrderId: extract from calldata
      const hex = calldata.startsWith('0x') ? calldata.slice(2) : calldata;
      const param2 = hex.slice(72, 136);
      const param3 = hex.slice(136, 200);
      const fromToken = param2.slice(24);
      const toToken = param3.slice(24);
      return { fromToken, toToken };
    }

    // Default: USDC -> WETH
    return {
      fromToken: poolCfg.usdc.toLowerCase().replace('0x', ''),
      toToken: poolCfg.weth.toLowerCase().replace('0x', '')
    };
  }

  /**
   * Generate fromToken single commission suffix
   * SINGLE mode: 1 referrer with flag 3ca2
   * Contract reads backwards:
   * - calldatasize() - 0x20: Entry 0 (flag + rate + recipient)
   * - calldatasize() - 0x40: Token (flag + token address)
   *
   * Append order (left to right):
   * - Token (32 bytes): flag + token address
   * - Entry 0 (32 bytes): flag + rate + recipient
   */
  static generateFromTokenSingleCommission(fromToken) {
    // Single commission: 1 referrer entry with rate 10000000
    return '800000000000000000000000' + fromToken +                                      // Token (first)
           '3ca20afc2aaa000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad';   // Entry 0 (last)
  }

  /**
   * Generate fromToken double commission suffix
   * DUAL mode: 2 referrers with flag 2222
   * Contract reads backwards:
   * - calldatasize() - 0x20: Entry 0 (flag + rate + recipient)
   * - calldatasize() - 0x40: Token (flag + token address)
   * - calldatasize() - 0x60: Entry 1 (flag + rate + recipient)
   *
   * Structure (reading from end backwards):
   * - Entry 1 (32 bytes): flag + rate + recipient
   * - Token (32 bytes): flag + token address  <- in the middle!
   * - Entry 0 (32 bytes): flag + rate + recipient  <- last
   */
  static generateFromTokenDoubleCommission(fromToken) {
    // Dual commission: 2 referrer entries with rate 10000000 each
    return '22220afc2aaa000000989680591342772bbc7d0630efbdea3c0b704e7addad17' +  // Entry 1
           '800000000000000000000000' + fromToken +                                      // Token (middle)
           '22220afc2aaa000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad';   // Entry 0 (last)
  }

  /**
   * Generate toToken single commission suffix
   * Increases gas in afterSwap phase
   */
  static generateToTokenSingleCommission(toToken) {
    return '800000000000000000000000' + toToken + '3ca20afc2bbb000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad';
  }

  /**
   * Generate toToken double commission suffix
   */
  static generateToTokenDoubleCommission(toToken) {
    return '22220afc2bbb000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad' +
           '800000000000000000000000' + toToken +
           '22220afc2bbb000000989680358506b4c5c441873ade429c5a2be777578e2c6f';
  }

  /**
   * Generate trim single address suffix (TRIM_FLAG = 0x777777771111)
   * trimRate = 10 (1% of TRIM_DENOMINATOR=1000), must be <= TRIM_RATE_LIMIT=100
   */
  static generateTrimSingle(toToken) {
    // trimRate = 0x0a = 10 (1%)
    // expectAmountOut = 1
    // trimAddress = 0x399efa78cacd7784751cd9fbf2523edf9efdf6ad
    return '7777777711110000000000000000000000000000000000000000000000000001' +  // Entry 2: expectAmountOut = 1
           '77777777111100000000000a399efa78cacd7784751cd9fbf2523edf9efdf6ad';   // Entry 1: flag + rate=10 + address
  }

  /**
   * Generate trim double address suffix (TRIM_DUAL_FLAG = 0x777777772222)
   * trimRate = 10 (1%), chargeRate can be any value (for distributing trim amount)
   */
  static generateTrimDouble(toToken) {
    // trimRate = 0x0a = 10 (1%), chargeRate = 0x1f4 = 500 (50% to charge address)
    // expectAmountOut = 1
    return '7777777722220000000001f4591342772bbc7d0630efbdea3c0b704e7addad17' +  // Entry 3: chargeRate=500 + chargeAddr
           '7777777722220000000000000000000000000000000000000000000000000001' +  // Entry 2: expectAmountOut = 1
           '77777777222200000000000a399efa78cacd7784751cd9fbf2523edf9efdf6ad';   // Entry 1: flag + rate=10 + trimAddr
  }

  /**
   * Generate toToken double commission + trim double address (max gas) suffix
   */
  static generateMaxGasScenario(fromToken, toToken, swapType) {
    // TRIM double address (append first, before commission)
    // trimRate = 10 (1%), chargeRate = 500 (50%)
    const trimEntries =
      '7777777722220000000001f4591342772bbc7d0630efbdea3c0b704e7addad17' +  // Entry 3: chargeRate=500 + chargeAddr
      '7777777722220000000000000000000000000000000000000000000000000001' +  // Entry 2: expectAmountOut = 1
      '77777777222200000000000a399efa78cacd7784751cd9fbf2523edf9efdf6ad';   // Entry 1: flag + rate=10 + trimAddr

    // toToken double commission
    return trimEntries +
           '22220afc2bbb000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad' +  // Entry 1: referrer2
           '800000000000000000000000' + toToken +                                  // Token
           '22220afc2bbb000000989680591342772bbc7d0630efbdea3c0b704e7addad17';    // Entry 0: referrer1
  }

  /**
   * Get calldata suffix for scenario name
   * @param {string} scenarioName - Scenario name
   * @param {string} baseCalldata - Base calldata
   * @param {string} swapType - Swap type
   * @param {string} chain - Chain identifier (default: 'arb')
   */
  static getSuffixForScenario(scenarioName, baseCalldata, swapType, chain = 'arb') {
    const { fromToken, toToken } = ScenarioBuilder.extractTokenAddresses(baseCalldata, swapType, chain);

    const suffixMap = {
      'basic': '',
      'fromToken_single_commission': ScenarioBuilder.generateFromTokenSingleCommission(fromToken),
      'fromToken_double_commission': ScenarioBuilder.generateFromTokenDoubleCommission(fromToken),
      'toToken_single_commission': ScenarioBuilder.generateToTokenSingleCommission(toToken),
      'toToken_double_commission': ScenarioBuilder.generateToTokenDoubleCommission(toToken),
      'trim_single': ScenarioBuilder.generateTrimSingle(toToken),
      'trim_double': ScenarioBuilder.generateTrimDouble(toToken),
      'max_gas_scenario': ScenarioBuilder.generateMaxGasScenario(fromToken, toToken, swapType)
    };

    return suffixMap[scenarioName] || '';
  }

  /**
   * Build complete calldata for scenario
   * @param {string} baseCalldata - Base calldata
   * @param {string} scenarioName - Scenario name
   * @param {string} swapType - Swap type
   * @param {string} chain - Chain identifier (default: 'arb')
   */
  static buildCalldata(baseCalldata, scenarioName, swapType, chain = 'arb') {
    const suffix = ScenarioBuilder.getSuffixForScenario(scenarioName, baseCalldata, swapType, chain);
    return baseCalldata + suffix;
  }

  /**
   * Calculate extra ETH value needed for scenario (only for ETH->ERC20 with fromToken commission)
   * @param {string} scenarioName - Scenario name
   * @param {string} swapType - Swap type
   * @param {string} swapAmount - Swap amount (hex string with 0x prefix)
   * @returns {string} Extra ETH amount needed (hex string)
   */
  static calculateExtraValue(scenarioName, swapType, swapAmount) {
    // Only ETH->ERC20 with fromToken commission needs extra value
    if (swapType !== 'ETH->ERC20') {
      return '0x0';
    }

    // max_gas_scenario now uses toToken commission, no extra ETH needed
    if (scenarioName === 'max_gas_scenario') {
      return '0x0';
    }

    // Commission calculation formula (extracted from contract code):
    // commission = (inputAmount * rate) / (DENOMINATOR - totalRate)
    // where:
    // - rate = 0x989680 = 10,000,000 (per commission entry)
    // - DENOMINATOR = 10^9 = 1,000,000,000
    // - totalRate = rate * numEntries
    const inputAmount = BigInt(swapAmount);
    const RATE_PER_ENTRY = BigInt(10000000); // 0x989680
    const DENOMINATOR = BigInt(1000000000); // 10^9

    let numEntries = 0;
    if (scenarioName === 'fromToken_single_commission') {
      numEntries = 2; // Single has 2 commission entries
    } else if (scenarioName === 'fromToken_double_commission') {
      numEntries = 4; // Double has 4 commission entries
    }

    if (numEntries === 0) {
      return '0x0';
    }

    const totalRate = RATE_PER_ENTRY * BigInt(numEntries);
    const totalCommission = (inputAmount * totalRate) / (DENOMINATOR - totalRate);

    return '0x' + totalCommission.toString(16);
  }

  /**
   * Generate all scenarios calldata
   * @param {string} baseCalldata - Base calldata
   * @param {string} swapType - Swap type
   * @param {string} swapAmount - Swap amount (hex string with 0x prefix), for calculating ETH->ERC20 extra value
   * @param {string} chain - Chain identifier (default: 'arb')
   */
  static generateAllScenarios(baseCalldata, swapType = 'ERC20->ETH', swapAmount = '0x0', chain = 'arb') {
    const scenarios = [
      {
        name: 'basic',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'basic', swapType, chain),
        description: `Basic ${swapType} swap`,
        extraValue: '0x0'
      },
      {
        name: 'fromToken_single_commission',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'fromToken_single_commission', swapType, chain),
        description: `${swapType} with single fromToken commission`,
        extraValue: ScenarioBuilder.calculateExtraValue('fromToken_single_commission', swapType, swapAmount)
      },
      {
        name: 'fromToken_double_commission',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'fromToken_double_commission', swapType, chain),
        description: `${swapType} with double fromToken commission`,
        extraValue: ScenarioBuilder.calculateExtraValue('fromToken_double_commission', swapType, swapAmount)
      },
      {
        name: 'toToken_single_commission',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'toToken_single_commission', swapType, chain),
        description: `${swapType} with single toToken commission`,
        extraValue: '0x0'
      },
      {
        name: 'toToken_double_commission',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'toToken_double_commission', swapType, chain),
        description: `${swapType} with double toToken commission`,
        extraValue: '0x0'
      },
      {
        name: 'trim_single',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'trim_single', swapType, chain),
        description: `${swapType} with trim single address`,
        extraValue: '0x0'
      },
      {
        name: 'trim_double',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'trim_double', swapType, chain),
        description: `${swapType} with trim double address`,
        extraValue: '0x0'
      },
      {
        name: 'max_gas_scenario',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'max_gas_scenario', swapType, chain),
        description: `${swapType} with toToken double commission + trim double address`,
        extraValue: ScenarioBuilder.calculateExtraValue('max_gas_scenario', swapType, swapAmount)
      }
    ];

    return scenarios;
  }
}

// CLI test
if (require.main === module) {
  console.log('=== Scenario Builder Test ===\n');

  const baseCalldata = config.exampleCalldata.arb.dagSwap;

  console.log('Base calldata:', baseCalldata.slice(0, 66) + '...\n');

  // Generate all scenarios
  const scenarios = ScenarioBuilder.generateAllScenarios(baseCalldata, 'ERC20->ETH');

  scenarios.forEach((scenario, i) => {
    console.log(`${i + 1}. ${scenario.name}`);
    console.log(`   Description: ${scenario.description}`);
    console.log(`   Calldata length: ${scenario.calldata.length} chars`);
    console.log(`   Suffix length: ${scenario.calldata.length - baseCalldata.length} chars`);
    console.log();
  });

  console.log('All scenarios generated with different calldata lengths\n');
}

module.exports = ScenarioBuilder;
