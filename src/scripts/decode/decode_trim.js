import { ethers } from 'ethers';

/**
 * Trim parsing script - used to parse trim data from DEX transaction calldata
 * 
 * Trim functionality allows distributing excess amounts proportionally to specified addresses
 * when transaction output exceeds the expected amount
 * 
 * Data structure:
 * - Single Trim: 64 bytes (2 x 32-byte blocks)
 *   - Block 1 (32 bytes): trim_flag(6) + isToBTrim(1) + padding(5) + expect_amount(20)
 *   - Block 2 (32 bytes): trim_flag(6) + trim_rate(6) + trim_address(20)
 * 
 * - Dual Trim: 96 bytes (3 x 32-byte blocks)
 *   - Block 1 (32 bytes): trim_flag(6) + charge_rate(6) + charge_address(20)
 *   - Block 2 (32 bytes): trim_flag(6) + isToBTrim(1) + padding(5) + expect_amount(20)
 *   - Block 3 (32 bytes): trim_flag(6) + trim_rate1(6) + trim_address1(20)
 * 
 * isToBTrim values:
 * - 0x80 = toB trim
 * - 0x00 = toC trim
 * 
 * Output:
 * - hasTrim: false | "toB" | "toC"
 * 
 * Usage example:
 * const trimInfo = extractTrimInfoFromCalldata(calldata);
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

// Parse expected amount block: trim_flag(6) + isToBTrim(1) + padding(5) + expect_amount(20)
function parseExpectAmountBlock(bytes32Hex) {
    const hex = bytes32Hex.replace(/^0x/, "");
    // Validate flag (first 6 bytes = 12 hex chars)
    const flag = "0x" + hex.slice(0, 12);
    if (!Object.values(TRIM_FLAGS).some(f => f.toLowerCase() === flag.toLowerCase())) {
        throw new Error(`Invalid trim flag in expect amount block: ${flag}`);
    }
    // isToBTrim is 1 byte (2 hex chars) at position 12-14
    const isToBTrimHex = hex.slice(12, 14);
    const isToBTrim = isToBTrimHex === '80'; // 0x80 = toB, 0x00 = toC
    const trimType = isToBTrim ? 'toB' : 'toC';
    
    // Take low 20 bytes as expected amount (position 24-64)
    const expectAmountHex = "0x" + hex.slice(24, 64);
    const expectAmount = ethers.BigNumber.from(expectAmountHex).toString();
    
    return { expectAmount, trimType };
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
                // Block 2 (last 32 bytes): trim_flag + trim_rate + trim_address
                const trimData = parseTrimData(trimDataBlock);
                
                // Block 1 (second-to-last 32 bytes): trim_flag + isToBTrim + padding + expect_amount
                const expectData = parseExpectAmountBlock(expectAmountBlock);
                
                return {
                    hasTrim: expectData.trimType, // "toB" or "toC"
                    trimRate: trimData.rate,
                    trimAddress: trimData.address,
                    expectAmountOut: expectData.expectAmount,
                    chargeRate: "0",
                    chargeAddress: "0x0000000000000000000000000000000000000000"
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
                    // Block 3 (last 32 bytes): trim_flag + trim_rate1 + trim_address1
                    const trimData1 = parseTrimData(firstBlock);
                    // Block 2 (second-to-last 32 bytes): trim_flag + isToBTrim + padding + expect_amount
                    const expectData = parseExpectAmountBlock(secondBlock);
                    // Block 1 (third-to-last 32 bytes): trim_flag + charge_rate + charge_address
                    const trimData2 = parseTrimData(thirdBlock);
                    
                    return {
                        hasTrim: expectData.trimType, // "toB" or "toC"
                        trimRate: trimData1.rate,
                        trimAddress: trimData1.address,
                        expectAmountOut: expectData.expectAmount,
                        chargeRate: trimData2.rate,
                        chargeAddress: trimData2.address
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
