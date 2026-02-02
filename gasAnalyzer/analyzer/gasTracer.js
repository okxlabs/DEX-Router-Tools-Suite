const { ethers } = require('ethers');
const config = require('../config/chains');

/**
 * Gas tracer using debug_traceCall RPC method
 */
class GasTracer {
  constructor(chain) {
    this.chain = chain;
    this.chainConfig = config.chains[chain];
    // NOTE: ethers v5 uses ethers.providers.JsonRpcProvider (v6 uses ethers.JsonRpcProvider)
    this.provider = new ethers.providers.JsonRpcProvider(this.chainConfig.rpcUrl);
  }

  /**
   * Execute debug_traceCall to get detailed gas breakdown
   */
  async traceCall(txParams, blockNumber = 'latest', stateOverrides = null) {
    try {
      console.log(`\nTracing call on ${this.chainConfig.name}...`);
      console.log(`Contract: ${txParams.to}`);
      console.log(`Block: ${blockNumber}`);

      const traceConfig = {
        tracer: 'callTracer'
      };

      if (stateOverrides) {
        traceConfig.stateOverrides = stateOverrides;
      }

      const result = await this.provider.send('debug_traceCall', [
        txParams,
        blockNumber,
        traceConfig
      ]);

      return result;
    } catch (error) {
      console.error('Error tracing call:', error.message);

      if (error.message.includes('Method not found') || error.message.includes('not supported')) {
        console.error('\n⚠️  The RPC endpoint does not support debug_traceCall.');
        console.error('Please update config.js with your QuickNode endpoint.');
        console.error('\nGet QuickNode: https://www.quicknode.com/');
      }

      throw error;
    }
  }

  /**
   * Identify swap method and adapters from trace
   */
  identifySwapComponents(trace) {
    const components = {
      mainMethod: null,
      beforeSwap: null,
      adapters: [],
      afterSwap: null
    };

    const inputSelector = trace.input.slice(0, 10);

    // Identify main swap method
    for (const [methodKey, methodConfig] of Object.entries(config.methods)) {
      if (inputSelector === methodConfig.selector) {
        components.mainMethod = {
          name: methodConfig.name,
          selector: inputSelector,
          gasUsed: parseInt(trace.gasUsed, 16)
        };
        break;
      }
    }

    // Analyze calls to identify adapters
    if (trace.calls) {
      this.analyzeCallsForAdapters(trace.calls, components);
    }

    return components;
  }

  /**
   * Analyze direct child calls to find adapters (no recursive - avoid double counting)
   * dagSwap adapter already includes the gas of nested pool calls (e.g. uniswapV3 swap)
   */
  analyzeCallsForAdapters(calls, components, depth = 0) {
    for (const call of calls) {
      const callSelector = call.input?.slice(0, 10);

      // Check if this is a known adapter
      for (const [methodKey, methodConfig] of Object.entries(config.methods)) {
        if (methodConfig.adapterSelectors.includes(callSelector)) {
          // Only count top-level adapter calls (depth 0) to avoid double-counting
          // e.g., dagSwap_adapter already includes uniswapV3 swap gas
          if (depth === 0) {
            components.adapters.push({
              name: `${methodKey}_adapter`,
              selector: callSelector,
              to: call.to,
              gasUsed: parseInt(call.gasUsed, 16),
              type: call.type
            });
          }
          break;
        }
      }

      // Recursively analyze nested calls (but only for detection, not for gas counting)
      if (call.calls) {
        this.analyzeCallsForAdapters(call.calls, components, depth + 1);
      }
    }
  }

  /**
   * Check if a call is a token query (token0/token1/balance queries)
   * These are considered part of adapter operations
   */
  isTokenQuery(callSelector, callTo, poolAddress) {
    // Common token query selectors
    const querySelectors = [
      '0xd21220a7', // token0()
      '0x0dfe1681', // token1()
      '0xddca3f43', // fee()
      '0x70a08231'  // balanceOf(address)
    ];

    // If it's a query to the pool address, it's part of adapter
    if (callTo && poolAddress && callTo.toLowerCase() === poolAddress.toLowerCase()) {
      return querySelectors.includes(callSelector);
    }

    return false;
  }

  /**
   * Calculate gas breakdown for swap
   * Logic: Before = gas before adapter calls (excluding token queries to pools)
   *        Adapter = all adapter calls + token queries to pools
   *        After = remaining gas
   */
  calculateGasBreakdown(trace) {
    const components = this.identifySwapComponents(trace);
    const totalGas = parseInt(trace.gasUsed, 16);

    // Collect all adapter selectors
    const adapterSelectors = [];
    for (const methodConfig of Object.values(config.methods)) {
      adapterSelectors.push(...methodConfig.adapterSelectors);
    }

    // Find pool addresses from adapter calls
    const poolAddresses = new Set();
    components.adapters.forEach(adapter => {
      if (adapter.to) {
        poolAddresses.add(adapter.to.toLowerCase());
      }
    });

    // Calculate beforeSwap, adapterGas, and afterSwap
    let beforeSwap = 0;
    let adapterGas = 0;
    let foundFirstAdapter = false;
    let ethTransfersBeforeSwap = 0;  // Count ETH transfers before adapter

    if (trace.calls && trace.calls.length > 0) {
      for (const call of trace.calls) {
        const callSelector = call.input?.slice(0, 10);
        const callGas = parseInt(call.gasUsed, 16);
        const callValue = call.value ? parseInt(call.value, 16) : 0;

        // Check if this is an ETH transfer (empty input + has value)
        const isETHTransfer = (!callSelector || callSelector === '0x') && callValue > 0;

        const isAdapter = adapterSelectors.includes(callSelector);

        if (isAdapter) {
          foundFirstAdapter = true;
          adapterGas += callGas;
        } else if (!foundFirstAdapter) {
          // All gas before first adapter (including token queries) goes to beforeSwap
          beforeSwap += callGas;

          // Count ETH transfers before adapter (for commission distribution)
          // These show gasUsed=0 but actually consume ~21000 gas each
          if (isETHTransfer && callGas === 0) {
            ethTransfersBeforeSwap++;
          }
        }
        // Gas after adapters is calculated as remainder
      }
    }

    // Estimate gas for ETH transfers that showed 0 in trace
    // Each ETH transfer to EOA or simple contract costs ~21000 gas base + some overhead
    // From data: 2 transfers cost ~26653 gas total
    const estimatedETHTransferGas = ethTransfersBeforeSwap > 0
      ? ethTransfersBeforeSwap * 13327  // ~13327 gas per transfer (26653 / 2)
      : 0;

    beforeSwap += estimatedETHTransferGas;

    // Calculate afterSwap as total - before - adapter
    const afterSwap = totalGas - beforeSwap - adapterGas;

    return {
      total: trace.gasUsed,
      totalDecimal: totalGas,
      beforeSwap: beforeSwap,
      adapters: components.adapters,
      totalAdapterGas: adapterGas,
      afterSwap: afterSwap,
      mainMethod: components.mainMethod
    };
  }

  /**
   * Print gas breakdown
   */
  printGasBreakdown(breakdown) {
    console.log('\n=== Gas Breakdown ===');
    console.log(`Method: ${breakdown.mainMethod?.name || 'Unknown'}`);
    console.log(`Total Gas: ${breakdown.total}`);
    console.log();
    console.log(`Before Swap: ~${breakdown.beforeSwap.toLocaleString()}`);
    console.log();
    console.log('Adapters/Pools:');

    if (breakdown.adapters.length === 0) {
      console.log('  (No adapters detected)');
    } else {
      breakdown.adapters.forEach((adapter, i) => {
        console.log(`  ${i + 1}. ${adapter.name}: ${adapter.gasUsed.toLocaleString()}`);
      });
    }

    console.log(`Total Adapter Gas: ${breakdown.totalAdapterGas.toLocaleString()}`);
    console.log();
    console.log(`After Swap: ~${breakdown.afterSwap.toLocaleString()}`);
    console.log('====================\n');
  }
}

module.exports = GasTracer;

