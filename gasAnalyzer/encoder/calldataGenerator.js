const config = require('../config/chains');
const poolConfig = require('../config/pools');
const ScenarioBuilder = require('./scenarioBuilder');

/**
 * Generate calldata for testing different swap scenarios
 */
class CalldataGenerator {
  constructor(chain, method) {
    this.chain = chain;
    this.method = method;
    this.chainConfig = config.chains[chain];
    this.methodConfig = config.methods[method];
  }

  /**
   * Get base calldata for the specified chain and method
   */
  getBaseCalldata() {
    const baseCalldata = config.exampleCalldata[this.chain]?.[this.method];
    if (!baseCalldata) {
      throw new Error(`No example calldata found for ${this.chain} - ${this.method}`);
    }
    return baseCalldata;
  }

  /**
   * Generate test scenarios for a specific swap type
   */
  generateTestScenarios(swapType = 'ERC20->ETH') {
    const baseCalldata = this.getBaseCalldata();
    // Note: This uses fixed example calldata, so swapAmount is not available
    // For accurate commission calculation, use dynamicGasAnalyzer.js instead
    const scenarios = ScenarioBuilder.generateAllScenarios(baseCalldata, swapType, '0x0');
    return scenarios;
  }

  /**
   * Get all test scenarios for all swap types
   */
  getAllTestScenarios() {
    const swapTypes = ['ERC20->ETH', 'ERC20->ERC20', 'ETH->ERC20'];
    const allScenarios = [];

    for (const swapType of swapTypes) {
      const scenarios = this.generateTestScenarios(swapType);
      allScenarios.push(...scenarios);
    }

    return allScenarios;
  }

  /**
   * Generate transaction call parameters for debug_traceCall
   */
  generateTraceCallParams(calldata, from = null, blockNumber = 'latest') {
    const txParams = {
      from: from || poolConfig.defaultFrom,
      to: this.chainConfig.contract,
      data: calldata,
      value: '0x0'
    };

    return {
      txParams,
      blockNumber,
      tracerConfig: {
        tracer: 'callTracer'
      }
    };
  }

  /**
   * Print scenario summary
   */
  printScenarioSummary(scenario) {
    console.log('\n=== Scenario Summary ===');
    console.log(`Name: ${scenario.name}`);
    console.log(`Swap Type: ${scenario.swapType}`);
    console.log(`Description: ${scenario.description}`);
    console.log(`Chain: ${this.chainConfig.name}`);
    console.log(`Contract: ${this.chainConfig.contract}`);
    console.log(`Method: ${this.methodConfig.name}`);
    console.log(`Calldata: ${scenario.calldata.slice(0, 66)}...`);
    console.log('======================\n');
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node calldataGenerator.js <chain> <method> [scenario]');
    console.log('');
    console.log('Chains:', Object.keys(config.chains).join(', '));
    console.log('Methods:', Object.keys(config.methods).join(', '));
    console.log('');
    console.log('Examples:');
    console.log('  node calldataGenerator.js arb dagSwap basic');
    console.log('  node calldataGenerator.js eth unxSwap max_gas_scenario');
    console.log('  node calldataGenerator.js base uniswapV3 all');
    process.exit(1);
  }

  const [chain, method, scenarioName] = args;

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

  const generator = new CalldataGenerator(chain, method);

  if (scenarioName === 'all') {
    const scenarios = generator.getAllTestScenarios();
    scenarios.forEach(scenario => {
      generator.printScenarioSummary(scenario);
    });
    console.log(`Total scenarios generated: ${scenarios.length}`);
  } else {
    const scenarios = generator.getAllTestScenarios();
    const scenario = scenarios.find(s => s.name === (scenarioName || 'basic'));

    if (!scenario) {
      console.error(`Scenario not found: ${scenarioName}`);
      console.error('Available scenarios:', scenarios.map(s => s.name).join(', '));
      process.exit(1);
    }

    generator.printScenarioSummary(scenario);

    // Generate trace call params
    const traceParams = generator.generateTraceCallParams(scenario.calldata);
    console.log('Trace Call Parameters:');
    console.log(JSON.stringify(traceParams, null, 2));
  }
}

module.exports = CalldataGenerator;

