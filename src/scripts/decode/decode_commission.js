      
import { ethers } from 'ethers';

// ============================================================================
// Constants (matching CommissionLib.sol)
// ============================================================================

const BYTE_SIZE = {
    FLAG: 12,        // 6 bytes = 12 hex chars
    RATE: 12,        // 6 bytes = 12 hex chars
    ADDRESS: 40,     // 20 bytes = 40 hex chars
    BLOCK: 64,       // 32 bytes = 64 hex chars
};

// Commission flag prefixes for identification
const FLAG_PATTERNS = {
    SINGLE_PREFIX: '0x3ca2',
    DUAL_PREFIX: '0x2222',
    MULTIPLE_PREFIX: '0x8888',
    FROM_SUFFIX: 'aaa',
    TO_SUFFIX: 'bbb',
};

// All valid commission flags (matching CommissionLib.sol lines 13-24)
const VALID_FLAGS = [
    '0x3ca20afc2aaa', // FROM_TOKEN_COMMISSION (SINGLE)
    '0x3ca20afc2bbb', // TO_TOKEN_COMMISSION (SINGLE)
    '0x22220afc2aaa', // FROM_TOKEN_COMMISSION_DUAL
    '0x22220afc2bbb', // TO_TOKEN_COMMISSION_DUAL
    '0x88880afc2aaa', // FROM_TOKEN_COMMISSION_MULTIPLE
    '0x88880afc2bbb', // TO_TOKEN_COMMISSION_MULTIPLE
];

// Commission limits (matching CommissionLib.sol lines 94-95)
const MIN_COMMISSION_MULTIPLE_NUM = 3;
const MAX_COMMISSION_MULTIPLE_NUM = 8;

// Ordinal names for commission blocks (used in return value)
const ORDINAL_NAMES = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine commission type from flag
 */
function getCommissionType(flag) {
    const lowerFlag = flag.toLowerCase();
    let amount;
    if (lowerFlag.startsWith(FLAG_PATTERNS.SINGLE_PREFIX)) {
        amount = 'SINGLE';
    } else if (lowerFlag.startsWith(FLAG_PATTERNS.DUAL_PREFIX)) {
        amount = 'DUAL';
    } else if (lowerFlag.startsWith(FLAG_PATTERNS.MULTIPLE_PREFIX)) {
        amount = 'MULTIPLE';
    } else {
        amount = 'UNKNOWN';
    }
    const token = lowerFlag.endsWith(FLAG_PATTERNS.FROM_SUFFIX) ? 'FROM_TOKEN_COMMISSION' : 'TO_TOKEN_COMMISSION';
    return `${amount}_${token}`;
}

/**
 * Validate and parse a commission block (32 bytes)
 * Layout: [flag: 6 bytes][rate: 6 bytes][address: 20 bytes]
 */
function parseCommission(bytes32Hex) {
    const hex = bytes32Hex.replace(/^0x/, '');
    const flag = '0x' + hex.slice(0, BYTE_SIZE.FLAG);
    
    // Validate flag
    if (!VALID_FLAGS.some(f => f.toLowerCase() === flag.toLowerCase())) {
        throw new Error(`Invalid commission flag: ${flag}`);
    }

    const rate = ethers.BigNumber.from('0x' + hex.slice(BYTE_SIZE.FLAG, BYTE_SIZE.FLAG + BYTE_SIZE.RATE)).toString();
    const address = '0x' + hex.slice(BYTE_SIZE.FLAG + BYTE_SIZE.RATE, BYTE_SIZE.FLAG + BYTE_SIZE.RATE + BYTE_SIZE.ADDRESS);

    return {
        flag,
        commissionType: getCommissionType(flag),
        rate,
        address
    };
}

/**
 * Parse middle block (32 bytes)
 * Layout: [isToB: 1 bit (highest)][referrerNum: 1 byte (for MULTIPLE)][padding][token: 20 bytes]
 */
function parseMiddle(bytes32Hex) {
    const hex = bytes32Hex.replace(/^0x/, '');
    return {
        isToB: hex.slice(0, 2) === '80',
        token: '0x' + hex.slice(24)
    };
}

/**
 * Parse referrer count from middle block (for MULTIPLE mode)
 */
function parseReferrerNumFromMiddle(bytes32Hex) {
    const hex = bytes32Hex.replace(/^0x/, '');
    return parseInt(hex.slice(2, 4), 16);
}

/**
 * Search for flag in calldata and extract blocks
 */
function findFlagAndExtractBlocks(calldataHex, flagHex, blockCount) {
    const flagIndex = calldataHex.indexOf(flagHex);
    
    if (flagIndex === -1) return null;

    const flagStart = flagIndex;
    const flagEnd = flagStart + BYTE_SIZE.BLOCK;
    const requiredLength = flagEnd + (BYTE_SIZE.BLOCK * (blockCount - 1));

    if (calldataHex.length < requiredLength) return null;

    const blocks = [];
    for (let i = 0; i < blockCount; i++) {
        const start = flagStart + (i * BYTE_SIZE.BLOCK);
        blocks.push('0x' + calldataHex.slice(start, start + BYTE_SIZE.BLOCK));
    }

    return { flagStart, blocks };
}

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract commission information from calldata
 * 
 * Data layout in calldata (from start to end):
 * - SINGLE:   [...original calldata...][middle][commission1]
 * - DUAL:     [...original calldata...][commission2][middle][commission1]
 * - MULTIPLE: [...original calldata...][commissionN]...[commission2][middle][commission1]
 * 
 * Return value format (compatible with original decode_commission.js):
 * - SINGLE:   { hasCommission, referCount, middle, first }
 * - DUAL:     { hasCommission, referCount, first, middle, last }
 * - MULTIPLE: { hasCommission, referCount, first, second, middle, third, fourth, ... }
 */
function extractCommissionInfoFromCalldata(calldataHex) {
    calldataHex = calldataHex.replace(/^0x/, '');

    // ========================================================================
    // Try SINGLE commission (1 referrer)
    // Structure: [middle][first]
    // ========================================================================
    for (const flag of ['0x3ca20afc2aaa', '0x3ca20afc2bbb']) {
        const flagIndex = calldataHex.indexOf(flag.replace(/^0x/, ''));
        
        if (flagIndex !== -1 && flagIndex >= BYTE_SIZE.BLOCK) {
            try {
                const first = '0x' + calldataHex.slice(flagIndex, flagIndex + BYTE_SIZE.BLOCK);
                const middle = '0x' + calldataHex.slice(flagIndex - BYTE_SIZE.BLOCK, flagIndex);

                return {
                    hasCommission: true,
                    referCount: 1,
                    middle: parseMiddle(middle),
                    first: parseCommission(first),
                };
            } catch {
                // Continue searching
            }
        }
    }

    // ========================================================================
    // Try DUAL commission (2 referrers)
    // Structure: [first][middle][last]
    // ========================================================================
    for (const flag of ['0x22220afc2aaa', '0x22220afc2bbb']) {
        const result = findFlagAndExtractBlocks(calldataHex, flag.replace(/^0x/, ''), 3);
        
        if (result) {
            try {
                const [first, middle, last] = result.blocks;
                return {
                    hasCommission: true,
                    referCount: 2,
                    first: parseCommission(first),
                    middle: parseMiddle(middle),
                    last: parseCommission(last),
                };
            } catch {
                // Continue searching
            }
        }
    }

    // ========================================================================
    // Try MULTIPLE commission (3-8 referrers)
    // Structure: [commissionN]...[commission2][middle][commission1]
    // The referrer count is encoded in the middle block's second byte
    // Middle block is always at: calldatasize - 0x40 (second-to-last block)
    // ========================================================================
    for (const flag of ['0x88880afc2aaa', '0x88880afc2bbb']) {
        const flagHex = flag.replace(/^0x/, '');
        const flagIndex = calldataHex.indexOf(flagHex);
        
        if (flagIndex === -1) continue;
        
        // Check if we have at least 4 blocks (minimum for MULTIPLE with 3 referrers)
        if (calldataHex.length < BYTE_SIZE.BLOCK * 4) continue;
        
        try {
            // Middle block is always second-to-last (at offset 0x40 from end)
            // In hex chars: calldataHex.length - 128 to calldataHex.length - 64
            const middleStart = calldataHex.length - (BYTE_SIZE.BLOCK * 2);
            const middleBlock = '0x' + calldataHex.slice(middleStart, middleStart + BYTE_SIZE.BLOCK);
            const referrerNum = parseReferrerNumFromMiddle(middleBlock);
            
            // Validate referrer count
            if (referrerNum < MIN_COMMISSION_MULTIPLE_NUM || referrerNum > MAX_COMMISSION_MULTIPLE_NUM) {
                continue;
            }
            
            // Calculate total block count: referrerNum commissions + 1 middle
            const totalBlocks = referrerNum + 1;
            
            // Verify we have enough data
            if (calldataHex.length < BYTE_SIZE.BLOCK * totalBlocks) continue;
            
            // Extract blocks using findFlagAndExtractBlocks
            const result = findFlagAndExtractBlocks(calldataHex, flagHex, totalBlocks);
            
            if (!result) continue;
            
            // Build return object with ordinal names
            // Physical layout: [commissionN]...[commission2][middle][commission1]
            // blocks[0] = commissionN (named "first")
            // blocks[1] = commission(N-1) (named "second")
            // ...
            // blocks[N-2] = commission2
            // blocks[N-1] = middle
            // blocks[N] = commission1
            //
            // For referrerNum = 3: blocks = [commission3, commission2, middle, commission1]
            // Return: { first: commission3, second: commission2, middle, third: commission1 }
            //
            // For referrerNum = 4: blocks = [commission4, commission3, commission2, middle, commission1]
            // Return: { first: commission4, second: commission3, third: commission2, middle, fourth: commission1 }
            
            const returnObj = {
                hasCommission: true,
                referCount: referrerNum,
            };
            
            const middleIndex = referrerNum - 1;
            const commission1Index = referrerNum;
            
            // Add first commission (commissionN, the furthest from end)
            returnObj[ORDINAL_NAMES[0]] = parseCommission(result.blocks[0]);
            
            // Add middle right after first
            returnObj.middle = parseMiddle(result.blocks[middleIndex]);
            
            // Add remaining commissions (commission(N-1) to commission2)
            for (let i = 1; i < middleIndex; i++) {
                returnObj[ORDINAL_NAMES[i]] = parseCommission(result.blocks[i]);
            }
            
            // Add commission1 (the last one in physical layout)
            returnObj[ORDINAL_NAMES[middleIndex]] = parseCommission(result.blocks[commission1Index]);
            
            return returnObj;
        } catch {
            // Continue searching
        }
    }

    return { hasCommission: false };
}

// ============================================================================
// Exports
// ============================================================================

export { 
    extractCommissionInfoFromCalldata, 
    VALID_FLAGS
};