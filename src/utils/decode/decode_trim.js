import { ethers } from 'ethers';

/**
 * Trim parsing script - used to parse trim data from DEX transaction calldata
 * 
 * Trim functionality allows distributing excess amounts proportionally to specified addresses
 * when transaction output exceeds the expected amount
 * 
 * Data structure:
 * - Single Trim: 64 bytes (2 x 32-byte blocks)
 *   - First 32 bytes: trim_flag + padding + expect_amount
 *   - Second 32 bytes: trim_flag + trim_rate + trim_address
 * 
 * - Dual Trim: 96 bytes (3 x 32-byte blocks)
 *   - First 32 bytes: trim_flag + trim_rate2 + trim_address2
 *   - Second 32 bytes: trim_flag + padding + expect_amount  
 *   - Third 32 bytes: trim_flag + trim_rate1 + trim_address1
 * 
 * Usage example:
 * const trimInfo = extractTrimInfoFromCalldata(calldata);
 * console.log("trimInfo:", trimInfo)
 */

// Define trim flag constants (6 bytes)
const TRIM_FLAGS = {
    SINGLE: "0x777777771111", // TRIM_FLAG (high 6 bytes)
    DUAL: "0x777777772222",   // TRIM_DUAL_FLAG (high 6 bytes)
};

// Parse bytes32 to {flag, rate, address}
function parseTrimData(bytes32Hex) {
    const hex = bytes32Hex.replace(/^0x/, "");
    const flag = "0x" + hex.slice(0, 12); // 6 bytes
    const rateHex = "0x" + hex.slice(12, 24); // 6 bytes
    const rate = ethers.BigNumber.from(rateHex).toString();
    const address = "0x" + hex.slice(24, 64); // 20 bytes
    
    // Validate flag must be in TRIM_FLAGS
    const allValidFlags = [TRIM_FLAGS.SINGLE, TRIM_FLAGS.DUAL];
    const isValidFlag = allValidFlags.some(validFlag => validFlag.toLowerCase() === flag.toLowerCase());
    
    if (!isValidFlag) {
        throw new Error(`Invalid trim flag: ${flag}. Must be one of: ${allValidFlags.join(', ')}`);
    }
    
    return { flag, rate, address };
}

// Parse expected amount (from the second 32-byte block)
function parseExpectAmount(bytes32Hex) {
    const hex = bytes32Hex.replace(/^0x/, "");
    // Validate flag
    const flag = "0x" + hex.slice(0, 12);
    if (!Object.values(TRIM_FLAGS).some(f => f.toLowerCase() === flag.toLowerCase())) {
        throw new Error(`Invalid trim flag in expect amount block: ${flag}`);
    }
    // Take low 20 bytes as expected amount
    const expectAmountHex = "0x" + hex.slice(24, 64);
    return ethers.BigNumber.from(expectAmountHex).toString();
}

// Main parsing function
function extractTrimInfoFromCalldata(calldataHex) {    
    // Handle single trim case
    const singleFlagHex = TRIM_FLAGS.SINGLE.replace(/^0x/, "");
    let flagIndex = calldataHex.indexOf(singleFlagHex);
    
    if (flagIndex !== -1) {
        // Find the last occurrence of single trim flag
        let lastFlagIndex = flagIndex;
        let searchIndex = flagIndex + 1;
        while (true) {
            const nextIndex = calldataHex.indexOf(singleFlagHex, searchIndex);
            if (nextIndex === -1) break;
            lastFlagIndex = nextIndex;
            searchIndex = nextIndex + 1;
        }
        
        const flagStart = lastFlagIndex;
        const flagEnd = flagStart + 64; // 32 bytes = 64 hex chars
        
        // Check if there's enough data to extract complete trim information
        if (flagStart >= 64) { // Need at least 64 bytes of preceding data
            // Last 32 bytes is trim data, second-to-last 32 bytes is expected amount
            const trimDataBlock = "0x" + calldataHex.slice(flagStart, flagEnd);
            const expectAmountBlock = "0x" + calldataHex.slice(flagStart - 64, flagStart);
            
            try {
                // First read (last 32 bytes) contains trimRate and trimAddress
                // Second read (second-to-last 32 bytes) contains expectAmountOut
                const trimData = parseTrimData(trimDataBlock);
                
                // For expectAmountOut, we need to extract from the second-to-last 32 bytes
                const hex = expectAmountBlock.replace(/^0x/, "");
                const expectAmountHex = "0x" + hex.slice(24, 64); // Take low 20 bytes
                const expectAmountOut = ethers.BigNumber.from(expectAmountHex).toString();
                
                return {
                    hasTrim: true,
                    trimRate: trimData.rate,
                    trimAddress: trimData.address,
                    expectAmountOut: expectAmountOut,
                    trimRate2: "0",
                    trimAddress2: "0x0000000000000000000000000000000000000000"
                };
            } catch (error) {
                // If parsing fails, continue to check dual trim
            }
        }
    }
    
    // Handle dual trim case
    const dualFlagHex = TRIM_FLAGS.DUAL.replace(/^0x/, "");
    flagIndex = calldataHex.indexOf(dualFlagHex);
    
    if (flagIndex !== -1) {
        // Find all dual flag occurrence positions
        const flagPositions = [];
        let searchIndex = 0;
        while (true) {
            const pos = calldataHex.indexOf(dualFlagHex, searchIndex);
            if (pos === -1) break;
            flagPositions.push(pos);
            searchIndex = pos + 1;
        }
        
        if (flagPositions.length >= 3) {
            // Use the last flag as starting point
            const flagStart = flagPositions[flagPositions.length - 1];
            const flagEnd = flagStart + 64;
            
            // Check if there's enough data to extract complete dual trim information
            if (flagStart >= 128) { // Need at least 128 bytes of preceding data
                const firstBlock = "0x" + calldataHex.slice(flagStart, flagEnd);
                const secondBlock = "0x" + calldataHex.slice(flagStart - 64, flagStart);
                const thirdBlock = "0x" + calldataHex.slice(flagStart - 128, flagStart - 64);
                
                try {
                    const trimData1 = parseTrimData(firstBlock);
                    const expectAmountOut = parseExpectAmount(secondBlock);
                    const trimData2 = parseTrimData(thirdBlock);
                    
                    return {
                        hasTrim: true,
                        trimRate: trimData1.rate,
                        trimAddress: trimData1.address,
                        expectAmountOut: expectAmountOut,
                        trimRate2: trimData2.rate,
                        trimAddress2: trimData2.address
                    };
                } catch (error) {
                    console.error("Failed to parse dual trim data:", error.message);
                }
            }
        }
    }
    
    return { hasTrim: false };
}

export { 
    extractTrimInfoFromCalldata,
    TRIM_FLAGS
};
