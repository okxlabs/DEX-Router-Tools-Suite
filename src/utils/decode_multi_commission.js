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
 * Main function to decode multiple commission occurrences from calldata
 * @param {string} calldata - The transaction calldata to decode
 * @returns {Object} Object containing all found commission information
 */
function decodeMultipleCommissionsFromCalldata(calldata) {
    const calldataHex = calldata.replace(/^0x/, "").toLowerCase();
    
    // Find all commission occurrences
    const commissions = findAllCommissions(calldataHex);
    
    // Format output as arrays
    const result = {
        totalCommissions: commissions.length,
        commissionInfo: []
    };
    
    // Add commission info as array
    commissions.forEach((commission) => {
        const commissionCopy = { ...commission };
        commissionCopy.index = commissionCopy.position; // Keep position as index
        delete commissionCopy.position; // Remove internal position tracking
        result.commissionInfo.push(commissionCopy);
    });
    
    return result;
}

module.exports = { 
    decodeMultipleCommissionsFromCalldata,
    findAllCommissions
};