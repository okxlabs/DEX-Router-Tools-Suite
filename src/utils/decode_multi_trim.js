const { ethers } = require("ethers");

/**
 * Multi-occurrence decoder for trim data
 * 
 * This script handles cases where a single calldata contains multiple 
 * trim information blocks. It uses a recursive approach to find all 
 * occurrences by searching from the end of each found occurrence.
 * 
 * Usage:
 * const result = decodeMultipleTrimsFromCalldata(calldata);
 * console.log(JSON.stringify(result, null, 2));
 */

const TRIM_FLAGS = {
    SINGLE: "0x777777771111", // TRIM_FLAG (high 6 bytes)
    DUAL: "0x777777772222",   // TRIM_DUAL_FLAG (high 6 bytes)
};

// Parse trim data
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

// Parse expected amount (from the trim second 32-byte block)
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
 * Recursively find all trim occurrences in calldata
 * @param {string} calldataHex - The calldata to search in
 * @param {number} startIndex - Index to start searching from
 * @returns {Array} Array of trim info objects
 */
function findAllTrims(calldataHex, startIndex = 0) {
    const trims = [];
    let searchIndex = startIndex;
    
    while (searchIndex < calldataHex.length) {
        let foundTrim = null;
        let nextSearchIndex = calldataHex.length;
        
        // Handle single trim case
        const singleFlagHex = TRIM_FLAGS.SINGLE.replace(/^0x/, "");
        let flagIndex = calldataHex.indexOf(singleFlagHex, searchIndex);
        
        if (flagIndex !== -1) {
            const flagStart = flagIndex;
            const flagEnd = flagStart + 64;
            
            if (flagStart >= 64) {
                try {
                    const trimDataBlock = "0x" + calldataHex.slice(flagStart, flagEnd);
                    const expectAmountBlock = "0x" + calldataHex.slice(flagStart - 64, flagStart);
                    
                    const trimData = parseTrimData(trimDataBlock);
                    
                    const hex = expectAmountBlock.replace(/^0x/, "");
                    const expectAmountHex = "0x" + hex.slice(24, 64);
                    const expectAmountOut = ethers.BigNumber.from(expectAmountHex).toString();
                    
                    foundTrim = {
                        hasTrim: true,
                        trimRate: trimData.rate,
                        trimAddress: trimData.address,
                        expectAmountOut: expectAmountOut,
                        trimRate2: "0",
                        trimAddress2: "0x0000000000000000000000000000000000000000",
                        position: flagStart
                    };
                    nextSearchIndex = flagEnd;
                } catch (error) {
                    // Continue searching if parsing fails
                }
            }
        }
        
        // Handle dual trim case
        const dualFlagHex = TRIM_FLAGS.DUAL.replace(/^0x/, "");
        const dualFlagIndex = calldataHex.indexOf(dualFlagHex, searchIndex);
        
        if (dualFlagIndex !== -1 && (!foundTrim || dualFlagIndex < foundTrim.position)) {
            // Find all dual flag occurrence positions from current search index
            const flagPositions = [];
            let dualSearchIndex = searchIndex;
            while (true) {
                const pos = calldataHex.indexOf(dualFlagHex, dualSearchIndex);
                if (pos === -1) break;
                flagPositions.push(pos);
                dualSearchIndex = pos + 1;
            }
            
            if (flagPositions.length >= 3) {
                // Use the first complete set of 3 flags found
                const flagStart = flagPositions[2]; // Third flag position
                const flagEnd = flagStart + 64;
                
                if (flagStart >= 128) {
                    try {
                        const firstBlock = "0x" + calldataHex.slice(flagStart, flagEnd);
                        const secondBlock = "0x" + calldataHex.slice(flagStart - 64, flagStart);
                        const thirdBlock = "0x" + calldataHex.slice(flagStart - 128, flagStart - 64);
                        
                        const trimData1 = parseTrimData(firstBlock);
                        const expectAmountOut = parseExpectAmount(secondBlock);
                        const trimData2 = parseTrimData(thirdBlock);
                        
                        foundTrim = {
                            hasTrim: true,
                            trimRate: trimData1.rate,
                            trimAddress: trimData1.address,
                            expectAmountOut: expectAmountOut,
                            trimRate2: trimData2.rate,
                            trimAddress2: trimData2.address,
                            position: flagStart
                        };
                        nextSearchIndex = flagEnd;
                    } catch (error) {
                        // Continue searching if parsing fails
                    }
                }
            }
        }
        
        if (foundTrim) {
            trims.push(foundTrim);
            searchIndex = nextSearchIndex;
        } else {
            break; // No more trims found
        }
    }
    
    return trims;
}

/**
 * Main function to decode multiple trim occurrences from calldata
 * @param {string} calldata - The transaction calldata to decode
 * @returns {Object} Object containing all found trim information
 */
function decodeMultipleTrimsFromCalldata(calldata) {
    const calldataHex = calldata.replace(/^0x/, "").toLowerCase();
    
    // Find all trim occurrences
    const trims = findAllTrims(calldataHex);
    
    // Format output as arrays
    const result = {
        totalTrims: trims.length,
        trimInfo: []
    };
    
    // Add trim info as array
    trims.forEach((trim) => {
        const trimCopy = { ...trim };
        trimCopy.index = trimCopy.position; // Keep position as index
        delete trimCopy.position; // Remove internal position tracking
        result.trimInfo.push(trimCopy);
    });
    
    return result;
}

module.exports = { 
    decodeMultipleTrimsFromCalldata,
    findAllTrims,
    parseTrimData,
    parseExpectAmount,
    TRIM_FLAGS
};
