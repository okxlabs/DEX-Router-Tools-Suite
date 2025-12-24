#!/usr/bin/env node

const { ethers } = require('ethers');
const config = require('../config/chains');
const fs = require('fs');
const path = require('path');

console.log('======================================================================');
console.log('      Testing debug_traceCall with QuickNode');
console.log('======================================================================\n');

console.log('=== Quick Test ===\n');

const chain = 'arb';
const chainConfig = config.chains[chain];

console.log(`Chain: ${chainConfig.name}`);
console.log(`RPC: ${chainConfig.rpcUrl}`);
console.log(`Contract: ${chainConfig.contract}`);

(async () => {
  try {
    // NOTE: ethers v5 uses ethers.providers.JsonRpcProvider
    const provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);

    console.log('\nCalling debug_traceCall...\n');

    const response = await provider.send('debug_traceCall', [
      {
        from: '0xF2048e7a1D4c19F658c19b3Cd35369f9f96223aF',
        to: chainConfig.contract,
        data: config.exampleCalldata[chain].dagSwap,
        value: '0x0'
      },
      'latest',
      {
        tracer: 'callTracer'
      }
    ]);

    console.log('✅ Success! Response received:\n');

    const gasUsed = parseInt(response.gasUsed, 16);
    console.log(`Type: ${response.type}`);
    console.log(`From: ${response.from}`);
    console.log(`To: ${response.to}`);
    console.log(`Gas Used: ${gasUsed.toLocaleString()}`);
    console.log(`Number of calls: ${response.calls?.length || 0}`);

    if (response.calls && response.calls.length > 0) {
      console.log('\nFirst-level calls:');
      response.calls.forEach((call, i) => {
        const callGas = parseInt(call.gasUsed, 16);
        console.log(`  ${i + 1}. ${call.type} to ${call.to.slice(0, 12)}... - Gas: ${callGas.toLocaleString()}`);
      });
    }

    // Save trace to result folder
    const resultDir = path.join(__dirname, '..', 'result');
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }
    const traceFile = path.join(resultDir, 'quick-test-trace.json');
    fs.writeFileSync(traceFile, JSON.stringify(response, null, 2));
    console.log(`\nFull trace saved to: ${traceFile}`);

    console.log('\n🎉 Your RPC endpoint works with debug_traceCall!\n');
    console.log('You can now run:');
    console.log('  node analyzer/gasAnalyzer.js arb dagSwap all');
    console.log('  node utils/verify_scenarios.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('Method not found') || error.message.includes('not supported')) {
      console.error('\n⚠️  The RPC endpoint does not support debug_traceCall.');
      console.error('Please update config/chains.js with your QuickNode endpoint that supports debug APIs.');
      console.error('\nGet QuickNode: https://www.quicknode.com/');
    }

    process.exit(1);
  }
})();

