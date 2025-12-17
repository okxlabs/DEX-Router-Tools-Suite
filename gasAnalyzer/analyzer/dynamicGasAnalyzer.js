const GasTracer = require('./gasTracer');
const CalldataEncoder = require('../encoder/calldataEncoder');
const ScenarioBuilder = require('../encoder/scenarioBuilder');
const poolConfig = require('../config/pools');
const config = require('../config/chains');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

/**
 * Dynamic Gas Analyzer - Uses dynamically generated calldata
 * No dependency on fixed example calldata
 */
class DynamicGasAnalyzer {
  constructor(chain, method) {
    this.chain = chain;
    this.method = method;
    this.tracer = new GasTracer(chain);
    this.results = [];
  }

  /**
   * Generate state overrides for ERC20 balance
   */
  generateStateOverrides() {
    const chainConfig = poolConfig.pools[this.chain];
    const from = poolConfig.defaultFrom;

    // Give the sender enough USDC and approve the router
    // NOTE: ethers v5 compatibility (v6 uses zeroPadValue/toBeHex/parseUnits on root)
    // In v5, use utils.hexlify + utils.hexZeroPad + utils.parseUnits.
    const storageSlot = ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32);

    const overrides = {};

    // Override USDC balance
    overrides[chainConfig.usdc] = {
      stateDiff: {
        // Balance slot (usually slot 0 or calculated)
        [storageSlot]: ethers.utils.hexZeroPad(
          ethers.utils.hexlify(ethers.utils.parseUnits('1000', 6)),
          32
        )
      }
    };

    return overrides;
  }

  /**
   * Analyze a single scenario
   */
  async analyzeScenario(scenario, baseMetadata) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Analyzing: ${scenario.name} - ${scenario.swapType}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const chainConfig = config.chains[this.chain];

      // Calculate total value: base value + extra value for fromToken commissions
      let totalValue = BigInt(baseMetadata.value || '0x0');
      if (scenario.extraValue && scenario.extraValue !== '0x0') {
        totalValue += BigInt(scenario.extraValue);
      }
      const valueHex = '0x' + totalValue.toString(16);

      const txParams = {
        from: baseMetadata.from,
        to: chainConfig.contract,
        data: scenario.calldata,
        value: valueHex
      };

      console.log(`Transaction:`);
      console.log(`  From: ${txParams.from}`);
      console.log(`  To: ${txParams.to}`);
      console.log(`  Value: ${txParams.value}${scenario.extraValue !== '0x0' ? ` (base: ${baseMetadata.value}, extra: ${scenario.extraValue})` : ''}`);
      console.log(`  Data length: ${scenario.calldata.length} chars`);

      // Trace the call
      const trace = await this.tracer.traceCall(txParams, baseMetadata.blockNumber);

      // Calculate gas breakdown
      const breakdown = this.tracer.calculateGasBreakdown(trace);
      this.tracer.printGasBreakdown(breakdown);

      const result = {
        scenario: scenario.name,
        swapType: scenario.swapType,
        description: scenario.description,
        breakdown,
        timestamp: new Date().toISOString()
      };

      this.results.push(result);
      return result;

    } catch (error) {
      console.error(`Error analyzing scenario ${scenario.name}:`, error.message);
      return {
        scenario: scenario.name,
        swapType: scenario.swapType,
        error: error.message
      };
    }
  }

  /**
   * Analyze all scenarios for a specific swap type
   */
  async analyzeSwapType(swapType, blockNumber = 'latest') {
    console.log(`\n${'*'.repeat(60)}`);
    console.log(`Analyzing: ${swapType} on ${this.chain}`);
    console.log(`Method: ${this.method}`);
    console.log(`${'*'.repeat(60)}`);

    // Generate base calldata
    console.log('\nGenerating base calldata...');
    const baseResult = await CalldataEncoder.generate(this.method, this.chain, swapType, blockNumber);

    console.log(`✓ Base calldata generated`);
    console.log(`  Method: ${baseResult.metadata.method}`);
    console.log(`  Pool: ${baseResult.metadata.pool}`);
    console.log(`  Amount: ${baseResult.metadata.amount}`);

    // Generate all scenarios (pass swapAmount and chain for commission calculation)
    const scenarios = ScenarioBuilder.generateAllScenarios(baseResult.calldata, swapType, baseResult.value, this.chain);
    console.log(`✓ ${scenarios.length} scenarios generated\n`);

    // Analyze each scenario
    for (const scenario of scenarios) {
      await this.analyzeScenario(scenario, baseResult);

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return this.results.filter(r => r.swapType === swapType);
  }

  /**
   * Analyze all swap types
   */
  async analyzeAllSwapTypes(blockNumber = 'latest') {
    const swapTypes = ['ERC20->ERC20', 'ETH->ERC20', 'ERC20->ETH'];

    for (const swapType of swapTypes) {
      await this.analyzeSwapType(swapType, blockNumber);
    }

    return this.results;
  }

  /**
   * Generate comparison table
   */
  generateComparisonTable(swapType) {
    const scenarioResults = this.results.filter(r => r.swapType === swapType && !r.error);

    if (scenarioResults.length === 0) {
      console.log(`No results available for ${swapType}`);
      return null;
    }

    console.log(`\n=== Gas Comparison Table: ${swapType} ===`);
    console.log(`Method: ${config.methods[this.method].name}`);
    console.log(`Chain: ${config.chains[this.chain].name}\n`);

    console.log('Scenario'.padEnd(40) + 'Before'.padEnd(12) + 'Adapters'.padEnd(12) + 'After'.padEnd(12) + 'Total');
    console.log('-'.repeat(88));

    const basicResult = scenarioResults.find(r => r.scenario === 'basic');
    const basicGas = basicResult?.breakdown;

    scenarioResults.forEach(result => {
      const b = result.breakdown;
      const row = [
        result.scenario.padEnd(40),
        b.beforeSwap.toLocaleString().padEnd(12),
        b.totalAdapterGas.toLocaleString().padEnd(12),
        b.afterSwap.toLocaleString().padEnd(12),
        b.totalDecimal.toLocaleString()
      ];
      console.log(row.join(''));

      if (basicGas && result.scenario !== 'basic') {
        const deltaRow = [
          '  (delta from basic)'.padEnd(40),
          `+${(b.beforeSwap - basicGas.beforeSwap).toLocaleString()}`.padEnd(12),
          `+${(b.totalAdapterGas - basicGas.totalAdapterGas).toLocaleString()}`.padEnd(12),
          `+${(b.afterSwap - basicGas.afterSwap).toLocaleString()}`.padEnd(12),
          `+${(b.totalDecimal - basicGas.totalDecimal).toLocaleString()}`
        ];
        console.log(deltaRow.join(''));
      }
    });

    console.log('='.repeat(88) + '\n');

    return {
      swapType,
      results: scenarioResults,
      basic: basicGas
    };
  }

  /**
   * Export results to CSV
   */
  exportToCSV(filename = null) {
    if (this.results.length === 0) {
      console.log('No results to export');
      return;
    }

    // NOTE: Write outputs under result/ by default.
    const resultDir = path.join(__dirname, '..', 'result');
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    const outputFile = filename
      ? filename
      : path.join(resultDir, `gas-analysis-${this.chain}-${this.method}-${Date.now()}.csv`);

    const header = [
      'Chain',
      'Method',
      'Scenario',
      'SwapType',
      'BeforeSwap',
      'TotalAdapterGas',
      'AfterSwap',
      'Total',
      'NumAdapters',
      'Timestamp'
    ].join(',');

    const rows = this.results
      .filter(r => !r.error)
      .map(result => {
        const b = result.breakdown;
        return [
          this.chain,
          this.method,
          result.scenario,
          result.swapType,
          b.beforeSwap,
          b.totalAdapterGas,
          b.afterSwap,
          b.totalDecimal,
          b.adapters.length,
          result.timestamp
        ].join(',');
      });

    const csv = [header, ...rows].join('\n');

    fs.writeFileSync(outputFile, csv);
    console.log(`\nResults exported to CSV: ${outputFile}`);

    return outputFile;
  }

  /**
   * Export results to JSON
   */
  exportToJSON(filename = null) {
    if (this.results.length === 0) {
      console.log('No results to export');
      return;
    }

    // NOTE: Write outputs under result/ by default.
    const resultDir = path.join(__dirname, '..', 'result');
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    const outputFile = filename
      ? filename
      : path.join(resultDir, `gas-analysis-${this.chain}-${this.method}-${Date.now()}.json`);

    const exportData = {
      chain: this.chain,
      chainName: config.chains[this.chain].name,
      contract: config.chains[this.chain].contract,
      method: this.method,
      methodName: config.methods[this.method].name,
      timestamp: new Date().toISOString(),
      results: this.results
    };

    fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
    console.log(`Results exported to JSON: ${outputFile}`);

    return outputFile;
  }

  /**
   * Generate summary report
   */
  generateSummaryReport() {
    console.log('\n' + '='.repeat(80));
    console.log('GAS ANALYSIS SUMMARY REPORT'.padStart(50));
    console.log('='.repeat(80));
    console.log(`Chain: ${config.chains[this.chain].name}`);
    console.log(`Contract: ${config.chains[this.chain].contract}`);
    console.log(`Method: ${config.methods[this.method].name}`);
    console.log(`Total Scenarios Analyzed: ${this.results.filter(r => !r.error).length}`);
    console.log(`Failed Scenarios: ${this.results.filter(r => r.error).length}`);
    console.log('='.repeat(80));

    const swapTypes = ['ERC20->ERC20', 'ETH->ERC20', 'ERC20->ETH'];
    swapTypes.forEach(swapType => {
      this.generateComparisonTable(swapType);
    });

    this.exportToCSV();
    this.exportToJSON();
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node dynamicGasAnalyzer.js <chain> <method> [swapType] [blockNumber]');
    console.log('');
    console.log('Chains:', Object.keys(config.chains).join(', '));
    console.log('Methods:', Object.keys(config.methods).join(', '));
    console.log('SwapTypes: ERC20->ERC20, ETH->ERC20, ERC20->ETH, all');
    console.log('');
    console.log('Examples:');
    console.log('  node dynamicGasAnalyzer.js arb uniswapV3 "ERC20->ERC20"');
    console.log('  node dynamicGasAnalyzer.js arb uniswapV3 erc20  # shorthand');
    console.log('  node dynamicGasAnalyzer.js eth dagSwap all 18500000');
    console.log('');
    console.log('Note: Swap types with -> must be quoted or use shorthand:');
    console.log('  erc20 = ERC20->ERC20');
    console.log('  eth2erc20 = ETH->ERC20');
    console.log('  erc202eth = ERC20->ETH');
    process.exit(1);
  }

  let [chain, method, swapTypeOrAll, blockNumber] = args;

  // Support shorthand swap types
  const swapTypeShorthands = {
    'erc20': 'ERC20->ERC20',
    'eth2erc20': 'ETH->ERC20',
    'erc202eth': 'ERC20->ETH'
  };

  if (swapTypeOrAll && swapTypeShorthands[swapTypeOrAll.toLowerCase()]) {
    swapTypeOrAll = swapTypeShorthands[swapTypeOrAll.toLowerCase()];
  }

  if (!config.chains[chain]) {
    console.error(`Invalid chain: ${chain}`);
    process.exit(1);
  }

  if (!config.methods[method]) {
    console.error(`Invalid method: ${method}`);
    process.exit(1);
  }

  (async () => {
    try {
      const analyzer = new DynamicGasAnalyzer(chain, method);

      if (swapTypeOrAll === 'all' || !swapTypeOrAll) {
        await analyzer.analyzeAllSwapTypes(blockNumber || 'latest');
      } else {
        await analyzer.analyzeSwapType(swapTypeOrAll, blockNumber || 'latest');
      }

      analyzer.generateSummaryReport();

    } catch (error) {
      console.error('Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}

module.exports = DynamicGasAnalyzer;

