const { ethers } = require("ethers");

/**
 * Multi-Trim parsing script - used to parse ALL trim data from DEX transaction calldata
 * 
 * This enhanced version can find multiple trims in a single calldata, unlike the original
 * decode_trim.js which stops after finding the first trim.
 * 
 * Trim functionality allows distributing excess amounts proportionally to specified addresses
 * when transaction output exceeds the expected amount
 * 
 * Data structure:
 * - Single Trim: 64 bytes (2 x 32-byte blocks)
 *   - First 32 bytes: trim_flag(6) + padding(6) + expect_amount(20)
 *   - Second 32 bytes: trim_flag(6) + trim_rate(6) + trim_address(20)
 * 
 * - Dual Trim: 96 bytes (3 x 32-byte blocks)
 *   - First 32 bytes: trim_flag(6) + charge_rate(6) + charge_address(20)
 *   - Second 32 bytes: trim_flag(6) + padding(6) + expect_amount(20)
 *   - Third 32 bytes: trim_flag(6) + trim_rate(6) + trim_address(20)
 * 
 * Usage example:
 * const allTrims = decodeMultipleTrimsFromCalldata(calldata);
 * console.log("All trims found:", allTrims);
 */

// Define trim flag constants (6 bytes)
const TRIM_FLAGS = {
    SINGLE: "0x777777771111", // Single address trim flag
    DUAL: "0x777777772222",   // Dual address trim flag
};

/**
 * Parse bytes32 to extract flag, rate, and address
 * @param {string} bytes32Hex - 32-byte hex string
 * @returns {object} - {flag, rate, address}
 */
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

/**
 * Parse expected amount from bytes32
 * @param {string} bytes32Hex - 32-byte hex string
 * @returns {string} - Expected amount as string
 */
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

/**
 * Find all occurrences of a pattern in calldata
 * @param {string} calldata - The calldata hex string
 * @param {string} pattern - The pattern to search for
 * @returns {number[]} - Array of positions where pattern is found
 */
function findAllOccurrences(calldata, pattern) {
    const positions = [];
    let searchIndex = 0;
    
    while (true) {
        const pos = calldata.indexOf(pattern, searchIndex);
        if (pos === -1) break;
        positions.push(pos);
        searchIndex = pos + 1;
    }
    
    return positions;
}

/**
 * Extract all single address trims from calldata
 * @param {string} calldataHex - The calldata hex string
 * @returns {object[]} - Array of single trim objects
 */
function extractAllSingleTrims(calldataHex) {
    const singleTrims = [];
    const singleFlagHex = TRIM_FLAGS.SINGLE.replace(/^0x/, "");
    const flagPositions = findAllOccurrences(calldataHex, singleFlagHex);
    
    // Group positions into pairs (each single trim needs 2 flag occurrences)
    for (let i = 0; i < flagPositions.length - 1; i++) {
        const firstFlagPos = flagPositions[i];
        const secondFlagPos = flagPositions[i + 1];
        
        // Check if positions are 64 characters apart (32 bytes = 64 hex chars)
        if (secondFlagPos - firstFlagPos === 64) {
            try {
                // First block: trim_flag + padding + expect_amount
                const expectAmountBlock = "0x" + calldataHex.slice(firstFlagPos, firstFlagPos + 64);
                // Second block: trim_flag + trim_rate + trim_address
                const trimDataBlock = "0x" + calldataHex.slice(secondFlagPos, secondFlagPos + 64);
                
                // Parse expect amount from first block
                const hex = expectAmountBlock.replace(/^0x/, "");
                const expectAmountHex = "0x" + hex.slice(24, 64); // Take low 20 bytes
                const expectAmountOut = ethers.BigNumber.from(expectAmountHex).toString();
                
                // Parse trim data from second block
                const trimData = parseTrimData(trimDataBlock);
                
                singleTrims.push({
                    type: "single",
                    position: firstFlagPos,
                    expectAmountOut: expectAmountOut,
                    trimRate: trimData.rate,
                    trimAddress: trimData.address
                });
                
                // Skip the next position since we've used it
                i++;
            } catch (error) {
                console.warn(`Failed to parse single trim at position ${firstFlagPos}:`, error.message);
            }
        }
    }
    
    return singleTrims;
}

/**
 * Extract all dual address trims from calldata
 * @param {string} calldataHex - The calldata hex string
 * @returns {object[]} - Array of dual trim objects
 */
function extractAllDualTrims(calldataHex) {
    const dualTrims = [];
    const dualFlagHex = TRIM_FLAGS.DUAL.replace(/^0x/, "");
    const flagPositions = findAllOccurrences(calldataHex, dualFlagHex);
    
    // Group positions into triplets (each dual trim needs 3 flag occurrences)
    for (let i = 0; i < flagPositions.length - 2; i++) {
        const firstFlagPos = flagPositions[i];
        const secondFlagPos = flagPositions[i + 1];
        const thirdFlagPos = flagPositions[i + 2];
        
        // Check if positions are correctly spaced (64 chars apart each)
        if (secondFlagPos - firstFlagPos === 64 && thirdFlagPos - secondFlagPos === 64) {
            try {
                // First block: trim_flag + charge_rate + charge_address
                const chargeBlock = "0x" + calldataHex.slice(firstFlagPos, firstFlagPos + 64);
                // Second block: trim_flag + padding + expect_amount
                const expectAmountBlock = "0x" + calldataHex.slice(secondFlagPos, secondFlagPos + 64);
                // Third block: trim_flag + trim_rate + trim_address
                const trimDataBlock = "0x" + calldataHex.slice(thirdFlagPos, thirdFlagPos + 64);
                
                // Parse all three blocks
                const chargeData = parseTrimData(chargeBlock);
                const expectAmountOut = parseExpectAmount(expectAmountBlock);
                const trimData = parseTrimData(trimDataBlock);
                
                dualTrims.push({
                    type: "dual",
                    position: firstFlagPos,
                    expectAmountOut: expectAmountOut,
                    trimRate: trimData.rate,
                    trimAddress: trimData.address,
                    chargeRate: chargeData.rate,
                    chargeAddress: chargeData.address
                });
                
                // Skip the next two positions since we've used them
                i += 2;
            } catch (error) {
                console.warn(`Failed to parse dual trim at position ${firstFlagPos}:`, error.message);
            }
        }
    }
    
    return dualTrims;
}

/**
 * Main function to extract all trims from calldata
 * @param {string} calldataHex - The calldata hex string
 * @returns {object} - Object containing all found trims and summary
 */
function decodeMultipleTrimsFromCalldata(calldataHex) {
    if (!calldataHex || typeof calldataHex !== 'string') {
        throw new Error('Invalid calldata: must be a non-empty string');
    }
    
    // Remove 0x prefix if present
    const cleanCalldata = calldataHex.replace(/^0x/, "");
    
    // Extract all single and dual trims
    const singleTrims = extractAllSingleTrims(cleanCalldata);
    const dualTrims = extractAllDualTrims(cleanCalldata);
    
    // Combine and sort by position
    const allTrims = [...singleTrims, ...dualTrims].sort((a, b) => a.position - b.position);
    
    return {
        hasTrims: allTrims.length > 0,
        totalTrims: allTrims.length,
        allTrims: allTrims
    };
}

module.exports = { 
    decodeMultipleTrimsFromCalldata,
    TRIM_FLAGS
};
