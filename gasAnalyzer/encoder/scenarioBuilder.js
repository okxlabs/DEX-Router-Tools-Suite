const config = require('../config/chains');

/**
 * 场景构建器 - 为不同测试场景生成特定的 calldata suffix
 * 基于 eth-gas-measurement 项目的场景设计
 */
class ScenarioBuilder {

  /**
   * 从 calldata 提取 fromToken 和 toToken 地址
   * 支持不同的方法类型
   */
  static extractTokenAddresses(calldata, swapType) {
    const selector = calldata.slice(0, 10);

    // For dagSwapByOrderId (0xf2c42696)
    if (selector === '0xf2c42696') {
      const hex = calldata.startsWith('0x') ? calldata.slice(2) : calldata;
      // dagSwap calldata structure (after 8-char selector):
      // Param 1 (64 chars): order ID
      // Param 2 (64 chars): fromToken (last 40 chars)
      // Param 3 (64 chars): toToken (last 40 chars)
      const param2 = hex.slice(72, 136);
      const param3 = hex.slice(136, 200);
      const fromToken = param2.slice(24);
      const toToken = param3.slice(24);
      return { fromToken, toToken };
    }

    // For uniswapV3SwapTo (0x0d5f0e3b) and unxswapByOrderId (0x9871efa4)
    // These methods don't have fromToken/toToken in calldata
    // We need to infer from swapType and use pool config
    const poolConfig = require('../config/pools');
    const poolCfg = poolConfig.pools.arb; // Default to arb for now

    // ETH special address for native ETH (not WETH)
    const ETH_ADDRESS = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    if (swapType === 'ERC20->ERC20') {
      // USDC -> WETH
      return {
        fromToken: poolCfg.usdc.toLowerCase().replace('0x', ''),
        toToken: poolCfg.weth.toLowerCase().replace('0x', '')
      };
    } else if (swapType === 'ERC20->ETH') {
      // USDC -> ETH (output WETH is unwrapped to ETH via _WETH_UNWRAP_MASK)
      // For toToken commission, use ETH special address since unwrap happens
      return {
        fromToken: poolCfg.usdc.toLowerCase().replace('0x', ''),
        toToken: ETH_ADDRESS // Use ETH address, not WETH
      };
    } else {
      // ETH->ERC20: ETH -> USDC
      // For fromToken commission, use ETH special address
      return {
        fromToken: ETH_ADDRESS,
        toToken: poolCfg.usdc.toLowerCase().replace('0x', '')
      };
    }
  }

  /**
   * 生成 fromToken 单分佣 suffix
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
   * 生成 fromToken 双分佣 suffix
   * DUAL mode: 2 referrers with flag 2222
   * Contract reads backwards:
   * - calldatasize() - 0x20: Entry 0 (flag + rate + recipient)
   * - calldatasize() - 0x40: Token (flag + token address)
   * - calldatasize() - 0x60: Entry 1 (flag + rate + recipient)
   *
   * Structure (reading from end backwards):
   * - Entry 1 (32 bytes): flag + rate + recipient
   * - Token (32 bytes): flag + token address  ← 在中间！
   * - Entry 0 (32 bytes): flag + rate + recipient  ← 最后
   */
  static generateFromTokenDoubleCommission(fromToken) {
    // Dual commission: 2 referrer entries with rate 10000000 each
    return '22220afc2aaa000000989680591342772bbc7d0630efbdea3c0b704e7addad17' +  // Entry 1
           '800000000000000000000000' + fromToken +                                      // Token (middle)
           '22220afc2aaa000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad';   // Entry 0 (last)
  }

  /**
   * 生成 toToken 单分佣 suffix
   * 在 afterSwap 阶段增加 gas
   */
  static generateToTokenSingleCommission(toToken) {
    return '800000000000000000000000' + toToken + '3ca20afc2bbb000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad';
  }

  /**
   * 生成 toToken 双分佣 suffix
   */
  static generateToTokenDoubleCommission(toToken) {
    return '22220afc2bbb000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad' +
           '800000000000000000000000' + toToken +
           '22220afc2bbb000000989680358506b4c5c441873ade429c5a2be777578e2c6f';
  }

  /**
   * 生成最大 gas 场景 suffix
   *
   * 策略：使用 toToken 双分佣 + TRIM
   * - toToken 双分佣在 afterSwap 阶段消耗最多 gas
   * - 加上 TRIM (3个正滑点条目) 进一步增加 afterSwap gas
   * - 实际测试显示：toToken 双分佣的 afterSwap gas > fromToken 双分佣 + TRIM
   *
   * 注意：合约不允许同时有 fromToken 和 toToken commission！
   * 所以 max_gas_scenario = toToken 双分佣 + TRIM (正滑点)
   */
  static generateMaxGasScenario(fromToken, toToken, swapType) {
    // TRIM 条目（3个正滑点地址）
    // 使用两个不同的 recipient 地址以最大化 gas 消耗
    const trimEntries =
      '77777777222200000000000a591342772bbc7d0630efbdea3c0b704e7addad17' +  // TRIM Entry 1: recipient 0x591342...
      '7777777722220000000000000000000000000000000000000000000000000001' +  // TRIM Entry 2: amount 0x01
      '77777777222200000000000a399efa78cacd7784751cd9fbf2523edf9efdf6ad';  // TRIM Entry 3: recipient 0x399efa...

    // toToken 双分佣
    // 使用两个不同的 recipient 地址 (0x399efa 和 0x591342)
    // 这会产生 4 次独立的 token 转账，最大化 gas 消耗
    return trimEntries +
           '22220afc2bbb000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad' +  // Entry 1: recipient 0x399efa...
           '800000000000000000000000' + toToken +                                      // Token
           '22220afc2bbb000000989680591342772bbc7d0630efbdea3c0b704e7addad17';   // Entry 0: recipient 0x591342...
  }

  /**
   * 根据场景名称获取 calldata suffix
   */
  static getSuffixForScenario(scenarioName, baseCalldata, swapType) {
    const { fromToken, toToken } = ScenarioBuilder.extractTokenAddresses(baseCalldata, swapType);

    const suffixMap = {
      'basic': '',
      'fromToken_single_commission': ScenarioBuilder.generateFromTokenSingleCommission(fromToken),
      'fromToken_double_commission': ScenarioBuilder.generateFromTokenDoubleCommission(fromToken),
      'toToken_single_commission': ScenarioBuilder.generateToTokenSingleCommission(toToken),
      'toToken_double_commission': ScenarioBuilder.generateToTokenDoubleCommission(toToken),
      'max_gas_scenario': ScenarioBuilder.generateMaxGasScenario(fromToken, toToken, swapType)
    };

    return suffixMap[scenarioName] || '';
  }

  /**
   * 为场景生成完整的 calldata
   */
  static buildCalldata(baseCalldata, scenarioName, swapType) {
    const suffix = ScenarioBuilder.getSuffixForScenario(scenarioName, baseCalldata, swapType);
    return baseCalldata + suffix;
  }

  /**
   * 计算场景所需的额外 ETH value (仅对 ETH->ERC20 且有 fromToken 分佣时)
   * @param {string} scenarioName - 场景名称
   * @param {string} swapType - 交换类型
   * @param {string} swapAmount - swap 金额 (hex string with 0x prefix)
   * @returns {string} 额外需要的 ETH 金额 (hex string)
   */
  static calculateExtraValue(scenarioName, swapType, swapAmount) {
    // 只有 ETH->ERC20 且有 fromToken 分佣时需要额外 value
    if (swapType !== 'ETH->ERC20') {
      return '0x0';
    }

    // max_gas_scenario 现在使用 toToken 分佣，不需要额外 ETH
    if (scenarioName === 'max_gas_scenario') {
      return '0x0';
    }

    // Commission 计算公式 (从合约代码提取):
    // commission = (inputAmount * rate) / (DENOMINATOR - totalRate)
    // 其中:
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
   * 生成所有场景的 calldata
   * @param {string} baseCalldata - 基础 calldata
   * @param {string} swapType - 交换类型
   * @param {string} swapAmount - swap 金额 (hex string with 0x prefix), 用于计算 ETH->ERC20 的 extra value
   */
  static generateAllScenarios(baseCalldata, swapType = 'ERC20->ETH', swapAmount = '0x0') {
    const scenarios = [
      {
        name: 'basic',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'basic', swapType),
        description: `Basic ${swapType} swap`,
        extraValue: '0x0'
      },
      {
        name: 'fromToken_single_commission',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'fromToken_single_commission', swapType),
        description: `${swapType} with single fromToken commission`,
        extraValue: ScenarioBuilder.calculateExtraValue('fromToken_single_commission', swapType, swapAmount)
      },
      {
        name: 'fromToken_double_commission',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'fromToken_double_commission', swapType),
        description: `${swapType} with double fromToken commission`,
        extraValue: ScenarioBuilder.calculateExtraValue('fromToken_double_commission', swapType, swapAmount)
      },
      {
        name: 'toToken_single_commission',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'toToken_single_commission', swapType),
        description: `${swapType} with single toToken commission`,
        extraValue: '0x0'
      },
      {
        name: 'toToken_double_commission',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'toToken_double_commission', swapType),
        description: `${swapType} with double toToken commission`,
        extraValue: '0x0'
      },
      {
        name: 'max_gas_scenario',
        swapType,
        calldata: ScenarioBuilder.buildCalldata(baseCalldata, 'max_gas_scenario', swapType),
        description: `${swapType} max gas (double commission + TRIM)`,
        extraValue: ScenarioBuilder.calculateExtraValue('max_gas_scenario', swapType, swapAmount)
      }
    ];

    return scenarios;
  }
}

// CLI 测试
if (require.main === module) {
  console.log('=== Scenario Builder 测试 ===\n');

  const baseCalldata = config.exampleCalldata.arb.dagSwap;

  console.log('基础 calldata:', baseCalldata.slice(0, 66) + '...\n');

  // 生成所有场景
  const scenarios = ScenarioBuilder.generateAllScenarios(baseCalldata, 'ERC20->ETH');

  scenarios.forEach((scenario, i) => {
    console.log(`${i + 1}. ${scenario.name}`);
    console.log(`   描述: ${scenario.description}`);
    console.log(`   Calldata 长度: ${scenario.calldata.length} 字符`);
    console.log(`   后缀长度: ${scenario.calldata.length - baseCalldata.length} 字符`);
    console.log();
  });

  console.log('✅ 所有场景已生成，calldata 长度各不相同\n');
}

module.exports = ScenarioBuilder;

