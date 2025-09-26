import { ethers } from 'ethers';

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

    // SINGLE: first appearance: last 32 bytes -> first; 32 bytes before -> middle; 32 bytes before middle -> last
    // DUAL: last appearance: 32 bytes -> first; 32 bytes before -> middle; 
};

// Parse bytes32 to {flag, rate, address, isToB}
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

// Parse middle field
function parseMiddle(bytes32Hex) {
    const hex = bytes32Hex.replace(/^0x/, "");
    const isToB = hex.slice(0, 2) === "80";
    const token = "0x" + hex.slice(24);
    return { isToB, token };
}

// Main parsing function
function extractCommissionInfoFromCalldata(calldataHex) {
    // Handle SINGLE case: search for SINGLE flag in calldata
    for (const singleFlag of COMMISSION_FLAGS.SINGLE) {
        const flagHex = singleFlag.replace(/^0x/, ""); // Remove 0x prefix for searching
        const flagIndex = calldataHex.indexOf(flagHex);
        if (flagIndex !== -1) {
            // Found SINGLE flag, extract 32-byte blocks
            const flagStart = flagIndex;
            const flagEnd = flagStart + 64; // 32 bytes = 64 hex chars
            
            // Check if there's enough data to extract middle, no last
            if (flagStart >= 64) { // Need at least 64 bytes (middle) 
                const first = "0x" + calldataHex.slice(flagStart, flagEnd);
                const middle = "0x" + calldataHex.slice(flagStart - 64, flagStart);
                
                const firstCommission = parseCommission(first);
                const middleInfo = parseMiddle(middle);
                
                return {
                    hasCommission: true,
                    referCount: 1,
                    middle: middleInfo,
                    first: firstCommission,
                };
            }
        }
    }
    
    // Handle DUAL case: search for two DUAL flags
    for (const dualFlag of COMMISSION_FLAGS.DUAL) {
        const flagHex = dualFlag.replace(/^0x/, ""); // Remove 0x prefix for searching
        let firstIndex = calldataHex.indexOf(flagHex);
        
        if (firstIndex !== -1) {
            // Found first DUAL flag, search for second one
            let secondIndex = calldataHex.indexOf(flagHex, firstIndex + 1);
            
            if (secondIndex !== -1) {
                // Found two DUAL flags, use the last one (second one)
                const flagStart = secondIndex;
                const flagEnd = flagStart + 64; // 32 bytes = 64 hex chars
                
                // Check if there's enough data to extract middle and last
                if (flagStart >= 128) { // Need at least 64 bytes (middle) + 64 bytes (last) = 128 hex chars
                    const first = "0x" + calldataHex.slice(flagStart, flagEnd);
                    const middle = "0x" + calldataHex.slice(flagStart - 64, flagStart);
                    const last = "0x" + calldataHex.slice(flagStart - 128, flagStart - 64);
                    
                    // Validate that last's first 6 bytes equal DUAL flag
                    const lastCommission = parseCommission(last);
                    const firstCommission = parseCommission(first);
                    const middleInfo = parseMiddle(middle);
                    
                    if (lastCommission.flag.toLowerCase() === dualFlag.toLowerCase()) {
                        return {
                            hasCommission: true,
                            referCount: 2,
                            hasToB: lastCommission.isToB || firstCommission.isToB || middleInfo.isToB,
                            last: lastCommission,
                            middle: middleInfo,
                            first: firstCommission,
                        };
                    }
                }
            }
        }
    }
    
    return { hasCommission: false };
}

export { extractCommissionInfoFromCalldata }; 
