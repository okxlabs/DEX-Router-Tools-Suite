const { ethers } = require("ethers");

/**
 * Multi-occurrence decoder for commission and trim data
 * 
 * This script handles cases where a single calldata contains multiple 
 * commission and/or trim information blocks. It uses a recursive approach
 * to find all occurrences by searching from the end of each found occurrence.
 * 
 * Usage:
 * const result = decodeMultipleFromCalldata(calldata);
 * console.log(JSON.stringify(result, null, 2));
 */

// Define flag constants (6 bytes)
const COMMISSION_FLAGS = {
    SINGLE: [ 
        "0x3ca20afc2aaa", // FROM_TOKEN_COMMISSION (high 6 bytes)
        "0x3ca20afc2bbb", // TO_TOKEN_COMMISSION (high 6 bytes)
    ],
    DUAL: [ 
        "0x22220afc2aaa", // FROM_TOKEN_COMMISSION_DUAL (high 6 bytes)
        "0x22220afc2bbb", // TO_TOKEN_COMMISSION_DUAL (high 6 bytes)
    ]
};


const TRIM_FLAGS = {
    SINGLE: "0x777777771111", // TRIM_FLAG (high 6 bytes)
    DUAL: "0x777777772222",   // TRIM_DUAL_FLAG (high 6 bytes)
};

// Parse bytes32 to {flag, rate, address}
function parseCommission(bytes32Hex) {
    const hex = bytes32Hex.replace(/^0x/, "");
    const flag = "0x" + hex.slice(0, 12); // 6 bytes
    const rateHex = "0x" + hex.slice(12, 24); // 6 bytes
    const rate = ethers.BigNumber.from(rateHex).toString();
    const address = "0x" + hex.slice(24, 64); // 20 bytes
    
    // Validate flag must be in COMMISSION_FLAGS
    const allValidFlags = [...COMMISSION_FLAGS.SINGLE, ...COMMISSION_FLAGS.DUAL];
    const isValidFlag = allValidFlags.some(validFlag => validFlag.toLowerCase() === flag.toLowerCase());
    
    if (!isValidFlag) {
        throw new Error(`Invalid commission flag: ${flag}. Must be one of: ${allValidFlags.join(', ')}`);
    }
    
    const commissionAmount = flag.startsWith("0x3ca2") ? "SINGLE" : "DUAL";
    const commissionToken = flag.endsWith("aaa") ? "FROM_TOKEN_COMMISSION" : "TO_TOKEN_COMMISSION";
    const commissionType = commissionAmount + "_" + commissionToken;
    
    return { 
        flag,
        commissionType, 
        rate, 
        address
    };
}

// Parse middle field for commission
function parseMiddle(bytes32Hex) {
    const hex = bytes32Hex.replace(/^0x/, "");
    const isToB = hex.slice(0, 2) === "80";
    const token = "0x" + hex.slice(24);
    return { isToB, token };
}

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
 * Recursively find all commission occurrences in calldata
 * @param {string} calldataHex - The calldata to search in
 * @param {number} startIndex - Index to start searching from
 * @returns {Array} Array of commission info objects
 */
function findAllCommissions(calldataHex, startIndex = 0) {
    const commissions = [];
    let searchIndex = startIndex;
    
    while (searchIndex < calldataHex.length) {
        let foundCommission = null;
        let nextSearchIndex = calldataHex.length;
        
        // Handle SINGLE case
        for (const singleFlag of COMMISSION_FLAGS.SINGLE) {
            const flagHex = singleFlag.replace(/^0x/, "");
            const flagIndex = calldataHex.indexOf(flagHex, searchIndex);
            
            if (flagIndex !== -1 && flagIndex < nextSearchIndex) {
                const flagStart = flagIndex;
                const flagEnd = flagStart + 64;
                
                if (flagStart >= 64) {
                    try {
                        const first = "0x" + calldataHex.slice(flagStart, flagEnd);
                        const middle = "0x" + calldataHex.slice(flagStart - 64, flagStart);
                        
                        const firstCommission = parseCommission(first);
                        const middleInfo = parseMiddle(middle);
                        
                        foundCommission = {
                            hasCommission: true,
                            referCount: 1,
                            middle: middleInfo,
                            first: firstCommission,
                            position: flagStart
                        };
                        nextSearchIndex = flagEnd;
                    } catch (error) {
                        // Continue searching if parsing fails
                    }
                }
            }
        }
        
        // Handle DUAL case
        for (const dualFlag of COMMISSION_FLAGS.DUAL) {
            const flagHex = dualFlag.replace(/^0x/, "");
            let firstIndex = calldataHex.indexOf(flagHex, searchIndex);
            
            if (firstIndex !== -1) {
                let secondIndex = calldataHex.indexOf(flagHex, firstIndex + 1);
                
                if (secondIndex !== -1 && secondIndex < nextSearchIndex) {
                    const flagStart = secondIndex;
                    const flagEnd = flagStart + 64;
                    
                    if (flagStart >= 128) {
                        try {
                            const first = "0x" + calldataHex.slice(flagStart, flagEnd);
                            const middle = "0x" + calldataHex.slice(flagStart - 64, flagStart);
                            const last = "0x" + calldataHex.slice(flagStart - 128, flagStart - 64);
                            
                            const lastCommission = parseCommission(last);
                            const firstCommission = parseCommission(first);
                            const middleInfo = parseMiddle(middle);
                            
                            if (lastCommission.flag.toLowerCase() === dualFlag.toLowerCase()) {
                                foundCommission = {
                                    hasCommission: true,
                                    referCount: 2,
                                    hasToB: lastCommission.isToB || firstCommission.isToB || middleInfo.isToB,
                                    last: lastCommission,
                                    middle: middleInfo,
                                    first: firstCommission,
                                    position: flagStart
                                };
                                nextSearchIndex = flagEnd;
                            }
                        } catch (error) {
                            // Continue searching if parsing fails
                        }
                    }
                }
            }
        }
        
        if (foundCommission) {
            commissions.push(foundCommission);
            searchIndex = nextSearchIndex;
        } else {
            break; // No more commissions found
        }
    }
    
    return commissions;
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
 * Main function to decode multiple commission and trim occurrences from calldata
 * @param {string} calldata - The transaction calldata to decode
 * @returns {Object} Object containing all found commission and trim information
 */
function decodeMultipleFromCalldata(calldata) {
    const calldataHex = calldata.replace(/^0x/, "").toLowerCase();
    
    // Find all commission occurrences
    const commissions = findAllCommissions(calldataHex);
    
    // Find all trim occurrences
    const trims = findAllTrims(calldataHex);
    
    // Format output as arrays
    const result = {
        totalCommissions: commissions.length,
        totalTrims: trims.length,
        commissionInfo: [],
        trimInfo: []
    };
    
    // Add commission info as array
    commissions.forEach((commission) => {
        const commissionCopy = { ...commission };
        commissionCopy.index = commissionCopy.position; // Keep position as index
        delete commissionCopy.position; // Remove internal position tracking
        result.commissionInfo.push(commissionCopy);
    });
    
    // Add trim info as array
    trims.forEach((trim) => {
        const trimCopy = { ...trim };
        trimCopy.index = trimCopy.position; // Keep position as index
        delete trimCopy.position; // Remove internal position tracking
        result.trimInfo.push(trimCopy);
    });
    
    return result;
}

// Example usage and testing
if (require.main === module) {
    // Example calldata with multiple occurrences (replace with actual test data)
    const calldata_front = "0x03b87e5f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d7ecaea56b618cde4af74b41131a00c96b814f69000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec70000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000068ba4c4b00000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000048000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000160000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000010000000000000000000000006747bcaf9bd5a5f0758cbe08903490e45ddfacb500000000000000000000000000000000000000000000000000000000000000010000000000000000000000006747bcaf9bd5a5f0758cbe08903490e45ddfacb500000000000000000000000000000000000000000000000000000000000000010000000000000000000027104e68ccd3e89f51c3074ca5072bbac773960dfa360000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000060000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

    const calldata_single = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee3ca20afc2aaa0000000f4240fb0d4899cd1cc823bda209d92475adf032514dba";

    const calldata_dual = "22220afc2aaa000000004e20000000000000000000000000000000000000beef8000000000000000000000008ac76a51cc950d9822d68b83fe1ad97b32cd580d22220afc2aaa0000000186a0000000000000000000000000000000000000dead11111111aaaaa"

    const single_dual_single = calldata_front + calldata_single + calldata_dual;
    const dual_single_dual = calldata_front + calldata_dual + calldata_single + calldata_dual;

    // const testCalldata = single_dual_single;
    const testCalldata = dual_single_dual;

    try {
        const result = decodeMultipleFromCalldata(testCalldata);
        console.log("calldata:" + testCalldata);
        console.log("result:");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Error decoding calldata:", error.message);
    }
}

module.exports = { 
    decodeMultipleFromCalldata,
    findAllCommissions,
    findAllTrims
};