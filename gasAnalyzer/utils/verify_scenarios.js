#!/usr/bin/env node

const CalldataEncoder = require('../encoder/calldataEncoder');
const ScenarioBuilder = require('../encoder/scenarioBuilder');
const poolConfig = require('../config/pools');

/**
 * Verify that scenario generation works correctly
 */
async function verifyScenarios() {
  console.log('='.repeat(80));
  console.log('SCENARIO GENERATION VERIFICATION');
  console.log('='.repeat(80));
  console.log();

  const chains = ['arb'];
  const methods = ['uniswapV3'];
  const swapTypes = ['ERC20->ERC20'];

  for (const chain of chains) {
    console.log(`\nCHAIN: ${chain.toUpperCase()}\n`);

    for (const method of methods) {
      console.log(`Method: ${method}\n`);

      for (const swapType of swapTypes) {
        try {
          // Generate base calldata
          const baseResult = CalldataEncoder.generate(method, chain, swapType);
          const baseCalldata = baseResult.calldata;

          console.log(`${swapType}:`);
          console.log(`  Base: ${baseCalldata.slice(0, 66)}...`);
          console.log(`  Length: ${baseCalldata.length} chars\n`);

          // Generate all scenarios (pass swapAmount for commission calculation)
          const scenarios = ScenarioBuilder.generateAllScenarios(baseCalldata, swapType, baseResult.value);

          console.log(`Scenarios (${scenarios.length}):\n`);

          scenarios.forEach((scenario, i) => {
            const suffix = scenario.calldata.slice(baseCalldata.length);
            console.log(`${i + 1}. ${scenario.name.padEnd(35)} +${suffix.length} chars`);
          });

          console.log('\n✓ All scenarios generated successfully\n');

        } catch (error) {
          console.log(`✗ Error: ${error.message}\n`);
        }
      }
    }
  }
}

verifyScenarios().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

