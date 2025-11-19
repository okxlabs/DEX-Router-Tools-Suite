const fs = require('fs');
const path = require('path');

function calculateGas() {
    try {
        // Read the trace.txt file
        const traceFilePath = path.join(__dirname, 'trace.txt');
        const traceContent = fs.readFileSync(traceFilePath, 'utf8');
        
        // Split content into lines for processing
        const lines = traceContent.split('\n');
        
        // Regular expression to match sellBase or sellQuote function calls with gas usage
        // Pattern: [gasUsage] address::sellBase or [gasUsage] address::sellQuote
        const functionPattern = /\[(\d+)\]\s+0x[a-fA-F0-9]+::(sellBase|sellQuote)/;
        
        console.log('=== Gas Usage Analysis ===\n');
        
        let foundFunctions = 0;
        let totalGasUsage = 0;
        
        // Loop through each line to find sellBase/sellQuote calls
        lines.forEach((line, index) => {
            const match = line.match(functionPattern);
            
            if (match) {
                const gasUsage = parseInt(match[1]);
                const functionName = match[2];
                
                foundFunctions++;
                totalGasUsage += gasUsage;
                
                console.log(`Function Calls: ${functionName}`);
                console.log(`Gas usage: ${gasUsage}\n`);
            }
        });
        
        if (foundFunctions === 0) {
            console.log('No sellBase or sellQuote function calls found in the trace file.');
        } else {
            console.log(`=== Summary ===`);
            console.log(`Total sellBase/sellQuote function calls found: ${foundFunctions}`);
            console.log(`Total gas usage: ${totalGasUsage}`);
        }
        
    } catch (error) {
        console.error('Error reading trace file:', error.message);
        console.error('Make sure trace.txt exists in the same directory as this script.');
    }
}

// Run the function
calculateGas();
