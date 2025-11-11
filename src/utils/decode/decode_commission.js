import { ethers } from 'ethers';

// Constants for parsing
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
    FROM_SUFFIX: 'aaa',
    TO_SUFFIX: 'bbb',
};

// All valid commission flags
const VALID_FLAGS = [
    '0x3ca20afc2aaa', // SINGLE_FROM_TOKEN_COMMISSION
    '0x3ca20afc2bbb', // SINGLE_TO_TOKEN_COMMISSION
    '0x22220afc2aaa', // DUAL_FROM_TOKEN_COMMISSION
    '0x22220afc2bbb', // DUAL_TO_TOKEN_COMMISSION
    '0x33330afc2aaa', // TRIPLE_FROM_TOKEN_COMMISSION
    '0x33330afc2bbb', // TRIPLE_TO_TOKEN_COMMISSION
];

/**
 * Determine commission type from flag
 */
function getCommissionType(flag) {
    const lowerFlag = flag.toLowerCase();
    const amount = lowerFlag.startsWith(FLAG_PATTERNS.SINGLE_PREFIX) ? 'SINGLE' : 
                   lowerFlag.startsWith(FLAG_PATTERNS.DUAL_PREFIX) ? 'DUAL' : 'TRIPLE';
    const token = lowerFlag.endsWith(FLAG_PATTERNS.FROM_SUFFIX) ? 'FROM_TOKEN_COMMISSION' : 'TO_TOKEN_COMMISSION';
    return `${amount}_${token}`;
}

/**
 * Validate and parse a commission block (32 bytes)
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
 * Parse middle block (32 bytes): isToB flag + token address
 */
function parseMiddle(bytes32Hex) {
    const hex = bytes32Hex.replace(/^0x/, '');
    return {
        isToB: hex.slice(0, 2) === '80',
        token: '0x' + hex.slice(24)
    };
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

/**
 * Extract commission information from calldata
 */
function extractCommissionInfoFromCalldata(calldataHex) {
    calldataHex = calldataHex.replace(/^0x/, '');

    // Try SINGLE commission: search for SINGLE flag
    for (const flag of ['0x3ca20afc2aaa', '0x3ca20afc2bbb']) {
        // For SINGLE case: we need the flag block and the middle block BEFORE it
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

    // Try DUAL commission: search for DUAL flags
    for (const flag of ['0x22220afc2aaa', '0x22220afc2bbb']) {
        const result = findFlagAndExtractBlocks(calldataHex, flag.replace(/^0x/, ''), 3);
        
        if (result) {
            try {
                const [first, middle, second] = result.blocks;
                return {
                    hasCommission: true,
                    referCount: 2,
                    first: parseCommission(first),
                    middle: parseMiddle(middle),
                    second: parseCommission(second),
                };
            } catch {
                // Continue searching
            }
        }
    }

    // Try TRIPLE commission: search for TRIPLE flags
    // Structure: first (flag+rate+addr) | second (flag+rate+addr) | middle (isToB+token) | third (flag+rate+addr)
    for (const flag of ['0x33330afc2aaa', '0x33330afc2bbb']) {
        const result = findFlagAndExtractBlocks(calldataHex, flag.replace(/^0x/, ''), 4);
        
        if (result) {
            try {
                const [first, second, middle, third] = result.blocks;
                return {
                    hasCommission: true,
                    referCount: 3,
                    first: parseCommission(first),
                    second: parseCommission(second),
                    middle: parseMiddle(middle),
                    third: parseCommission(third),
                };
            } catch {
                // Continue searching
            }
        }
    }

    return { hasCommission: false };
}

export { extractCommissionInfoFromCalldata, VALID_FLAGS };

