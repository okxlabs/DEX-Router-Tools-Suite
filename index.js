#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function main() {
    // Get command line arguments (skip first two: node and script name)
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error('Error: Please provide the cast call command as arguments.');
        console.error('Usage: node eth_gas.js cast call <contract_address> <function_signature> [options]');
        console.error('Example: node eth_gas.js cast call 0x... "0x..." --from 0x... --rpc-url https://... --trace');
        process.exit(1);
    }
    
    // Join all arguments to form the complete command
    const castCommand = args.join(' ');
    
    console.log('=== Ethereum Gas Analysis Tool ===\n');
    console.log('Executing cast call command...');
    try {
        // Execute the cast call command and capture output
        console.log('Running cast call with trace...');
        const traceOutput = execSync(castCommand, { 
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large traces
        });
        
        // Save the trace output to trace.txt (replace existing file)
        const traceFilePath = path.join(__dirname, 'trace.txt');
        fs.writeFileSync(traceFilePath, traceOutput);
        console.log('✓ Trace saved to trace.txt\n');
        
        // Call calculateGas.js to analyze the trace
        console.log('Analyzing gas usage...\n');
        const calculateGasPath = path.join(__dirname, 'calculateGas.js');
        
        // Check if calculateGas.js exists
        if (!fs.existsSync(calculateGasPath)) {
            console.error('Error: calculateGas.js not found in the same directory.');
            process.exit(1);
        }
        
        // Execute calculateGas.js
        const gasAnalysisOutput = execSync(`node "${calculateGasPath}"`, { 
            encoding: 'utf8',
            cwd: __dirname
        });
        
        // Display the gas analysis results
        console.log(gasAnalysisOutput);
        
    } catch (error) {
        console.error('Error executing command:', error.message);
        
        // Provide helpful error messages
        if (error.message.includes('cast: command not found')) {
            console.error('\nMake sure Foundry is installed and cast is in your PATH.');
            console.error('Install Foundry: https://getfoundry.sh/');
        } else if (error.message.includes('RPC')) {
            console.error('\nCheck your RPC URL and network connectivity.');
        } else if (error.message.includes('block')) {
            console.error('\nCheck if the specified block number is valid.');
        }
        
        process.exit(1);
    }
}

// Run the main function
main();
