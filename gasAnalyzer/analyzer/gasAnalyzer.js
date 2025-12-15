const GasTracer = require('./gasTracer');
const CalldataGenerator = require('../encoder/calldataGenerator');
const config = require('../config/chains');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive gas analyzer for DEX Router across multiple scenarios
 */
class GasAnalyzer {
  constructor(chain, method) {
    this.chain = chain;
    this.method = method;
    this.tracer = new GasTracer(chain);
    this.generator = new CalldataGenerator(chain, method);
    this.results = [];
  }

  /**
   * Analyze a single scenario
   */
  async analyzeScenario(scenario) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Analyzing: ${scenario.name} - ${scenario.swapType}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const traceParams = this.generator.generateTraceCallParams(scenario.calldata);
      const trace = await this.tracer.traceCall(traceParams.txParams, traceParams.blockNumber);

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
  async analyzeSwapType(swapType) {
    console.log(`\n${'*'.repeat(60)}`);
    console.log(`Analyzing all scenarios for: ${swapType}`);
    console.log(`${'*'.repeat(60)}`);

    const scenarios = this.generator.generateTestScenarios(swapType);

    for (const scenario of scenarios) {
      await this.analyzeScenario(scenario);
      // Add a small delay between calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return this.results.filter(r => r.swapType === swapType);
  }

  /**
   * Analyze all scenarios across all swap types
   */
  async analyzeAllScenarios() {
    const swapTypes = ['ERC20->ETH', 'ERC20->ERC20', 'ETH->ERC20'];

    for (const swapType of swapTypes) {
      await this.analyzeSwapType(swapType);
    }

    return this.results;
  }

  /**
   * Generate comparison table for a swap type
   */
  generateComparisonTable(swapType) {
    const scenarioResults = this.results.filter(r => r.swapType === swapType && !r.error);

    if (scenarioResults.length === 0) {
      console.log(`No results available for ${swapType}`);
      return null;
    }

    console.log(`\n=== Gas Comparison Table: ${swapType} ===`);
    console.log(`Method: ${this.generator.methodConfig.name}`);
    console.log(`Chain: ${this.tracer.chainConfig.name}\n`);

    // Table header
    console.log('Scenario'.padEnd(40) + 'Before'.padEnd(12) + 'Adapters'.padEnd(12) + 'After'.padEnd(12) + 'Total');
    console.log('-'.repeat(88));

    // Basic scenario as baseline
    const basicResult = scenarioResults.find(r => r.scenario === 'basic');
    const basicGas = basicResult?.breakdown;

    scenarioResults.forEach(result => {
      const b = result.breakdown;
      const row = [
        result.scenario.padEnd(40),
        b.beforeSwap.toLocaleString().padEnd(12),
        b.totalAdapterGas.toLocaleString().padEnd(12),
        b.afterSwap.toLocaleString().padEnd(12),
        b.total
      ];
      console.log(row.join(''));

      // Show delta from basic if applicable
      if (basicGas && result.scenario !== 'basic') {
        const beforeDelta = b.beforeSwap - basicGas.beforeSwap;
        const adapterDelta = b.totalAdapterGas - basicGas.totalAdapterGas;
        const afterDelta = b.afterSwap - basicGas.afterSwap;
        const totalDelta = b.totalDecimal - basicGas.totalDecimal;

        const deltaRow = [
          '  (delta from basic)'.padEnd(40),
          (beforeDelta >= 0 ? '+' : '') + beforeDelta.toLocaleString().padEnd(11),
          (adapterDelta >= 0 ? '+' : '') + adapterDelta.toLocaleString().padEnd(11),
          (afterDelta >= 0 ? '+' : '') + afterDelta.toLocaleString().padEnd(11),
          (totalDelta >= 0 ? '+' : '') + totalDelta.toLocaleString()
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

    // CSV header
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
          b.total,
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
      chainName: this.tracer.chainConfig.name,
      contract: this.tracer.chainConfig.contract,
      method: this.method,
      methodName: this.generator.methodConfig.name,
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
    console.log(`Chain: ${this.tracer.chainConfig.name}`);
    console.log(`Contract: ${this.tracer.chainConfig.contract}`);
    console.log(`Method: ${this.generator.methodConfig.name}`);
    console.log(`Total Scenarios Analyzed: ${this.results.filter(r => !r.error).length}`);
    console.log(`Failed Scenarios: ${this.results.filter(r => r.error).length}`);
    console.log('='.repeat(80));

    // Generate comparison tables for each swap type
    const swapTypes = ['ERC20->ETH', 'ERC20->ERC20', 'ETH->ERC20'];
    swapTypes.forEach(swapType => {
      this.generateComparisonTable(swapType);
    });

    // Export results
    this.exportToCSV();
    this.exportToJSON();
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node gasAnalyzer.js <chain> <method> [swapType|all]');
    console.log('');
    console.log('Chains:', Object.keys(config.chains).join(', '));
    console.log('Methods:', Object.keys(config.methods).join(', '));
    console.log('SwapTypes: ERC20->ETH, ERC20->ERC20, ETH->ERC20, all');
    console.log('');
    console.log('Examples:');
    console.log('  node gasAnalyzer.js arb dagSwap ERC20->ETH');
    console.log('  node gasAnalyzer.js eth unxSwap all');
    console.log('  node gasAnalyzer.js base uniswapV3 all');
    process.exit(1);
  }

  const [chain, method, swapTypeOrAll] = args;

  if (!config.chains[chain]) {
    console.error(`Invalid chain: ${chain}`);
    console.error('Available chains:', Object.keys(config.chains).join(', '));
    process.exit(1);
  }

  if (!config.methods[method]) {
    console.error(`Invalid method: ${method}`);
    console.error('Available methods:', Object.keys(config.methods).join(', '));
    process.exit(1);
  }

  (async () => {
    try {
      const analyzer = new GasAnalyzer(chain, method);

      if (swapTypeOrAll === 'all' || !swapTypeOrAll) {
        await analyzer.analyzeAllScenarios();
      } else {
        await analyzer.analyzeSwapType(swapTypeOrAll);
      }

      analyzer.generateSummaryReport();

    } catch (error) {
      console.error('Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}

module.exports = GasAnalyzer;

