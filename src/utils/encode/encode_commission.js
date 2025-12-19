import { ethers } from 'ethers';

// Constants for encoding
const BYTE_SIZE = {
    FLAG: 12,        // 6 bytes = 12 hex chars
    RATE: 12,        // 6 bytes = 12 hex chars
    ADDRESS: 40,     // 20 bytes = 40 hex chars
    BLOCK: 64,       // 32 bytes = 64 hex chars
};

const PADDING = '00'.repeat(10); // 10 bytes of padding for middle block (after referrerNum)

// Ordinal names for commission blocks
const ORDINAL_NAMES = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

// Min/Max commission limits
const MIN_COMMISSION_COUNT = 1;
const MAX_COMMISSION_COUNT = 8;

/**
 * Generate commission structure dynamically based on referCount
 * SINGLE (1): [middle, first]
 * DUAL (2): [first, middle, last]
 * MULTIPLE (3-8): [first, second, ..., middle, last-ordinal]
 */
function getCommissionStructure(referCount) {
    if (referCount < MIN_COMMISSION_COUNT || referCount > MAX_COMMISSION_COUNT) {
        throw new Error(`Invalid referCount: ${referCount}. Must be between ${MIN_COMMISSION_COUNT} and ${MAX_COMMISSION_COUNT}`);
    }

    if (referCount === 1) {
        // SINGLE: [middle, first]
        return { blocks: ['middle', 'first'], name: 'SINGLE' };
    } else if (referCount === 2) {
        // DUAL: [first, middle, last]
        return { blocks: ['first', 'middle', 'last'], name: 'DUAL' };
    } else {
        // MULTIPLE (3-8): [first, second, ..., (n-1)th, middle, nth]
        const blocks = [];
        
        // Add all commissions except the last one
        for (let i = 0; i < referCount - 1; i++) {
            blocks.push(ORDINAL_NAMES[i]);
        }
        
        // Add middle block
        blocks.push('middle');
        
        // Add the last commission
        blocks.push(ORDINAL_NAMES[referCount - 1]);
        
        return { blocks, name: 'MULTIPLE' };
    }
}

/**
 * Normalize hex string: remove 0x prefix, lowercase, and pad with zeros
 */
function normalizeHex(hex, length) {
    return hex.replace(/^0x/, '').toLowerCase().padStart(length, '0');
}

/**
 * Encode a single commission block (32 bytes)
 */
function encodeCommissionBlock(commission) {
    if (!commission.flag || commission.rate === undefined || !commission.address) {
        throw new Error('Commission block missing required fields: flag, rate, address');
    }

    const flag = normalizeHex(commission.flag, BYTE_SIZE.FLAG);
    const rateBN = ethers.BigNumber.from(commission.rate.toString());
    const rate = normalizeHex(rateBN.toHexString(), BYTE_SIZE.RATE);
    const address = normalizeHex(commission.address, BYTE_SIZE.ADDRESS);

    return flag + rate + address;
}

/**
 * Encode middle block (32 bytes): isToB + referrerNum + padding + token address
 * For SINGLE and DUAL: isToB + 00 + padding(10 bytes) + token
 * For MULTIPLE: isToB + referrerNum + padding(10 bytes) + token
 */
function encodeMiddleBlock(middle, referCount) {
    if (!middle.token) {
        throw new Error('Middle block missing required field: token');
    }

    const toBFlag = middle.isToB !== undefined ? middle.isToB : middle.toB;
    const isToB = toBFlag ? '80' : '00';
    
    // For MULTIPLE mode (3-8 referrers), encode referrerNum in second byte
    const referrerNum = (referCount >= 3 && referCount <= 8) 
        ? normalizeHex(ethers.BigNumber.from(referCount).toHexString(), 2)
        : '00';
    
    const token = normalizeHex(middle.token, BYTE_SIZE.ADDRESS);

    return isToB + referrerNum + PADDING + token;
}

/**
 * Add commission data to encoded calldata
 */
export function addCommissionToCalldata(calldata, commissionData) {
    try {
        validateCommissionData(commissionData);

        let calldataHex = calldata.replace(/^0x/, '');
        const structure = getCommissionStructure(commissionData.referCount);

        // Encode blocks according to structure
        const encodedBlocks = structure.blocks.map(blockType => {
            if (blockType === 'middle') {
                return encodeMiddleBlock(commissionData.middle, commissionData.referCount);
            }
            return encodeCommissionBlock(commissionData[blockType]);
        });

        calldataHex += encodedBlocks.join('');
        return '0x' + calldataHex;
    } catch (error) {
        throw new Error('Failed to encode commission data: ' + error.message);
    }
}

/**
 * Validate commission data structure
 */
export function validateCommissionData(commissionData) {
    if (!commissionData || typeof commissionData !== 'object') {
        throw new Error('Commission data must be an object');
    }

    const { referCount } = commissionData;
    
    // Validate referCount range
    if (!referCount || referCount < MIN_COMMISSION_COUNT || referCount > MAX_COMMISSION_COUNT) {
        throw new Error(`Commission data must have referCount between ${MIN_COMMISSION_COUNT} and ${MAX_COMMISSION_COUNT}, got: ${referCount}`);
    }

    // Check required properties
    if (!commissionData.middle || !commissionData.first) {
        throw new Error('Commission data must have middle and first properties');
    }

    // Validate middle block
    if (!commissionData.middle.token) {
        throw new Error('Middle block must have token property');
    }

    // Get the expected structure and validate all required blocks exist
    const structure = getCommissionStructure(referCount);
    const commissionsToValidate = [];
    
    for (const blockType of structure.blocks) {
        if (blockType === 'middle') {
            continue; // Already validated above
        }
        
        if (!commissionData[blockType]) {
            throw new Error(`Commission data with referCount ${referCount} must have ${blockType} property`);
        }
        
        commissionsToValidate.push(commissionData[blockType]);
    }

    // Validate each commission block
    for (const commission of commissionsToValidate) {
        validateCommissionBlock(commission);
    }

    return true;
}

/**
 * Validate individual commission block format
 */
function validateCommissionBlock(commission) {
    if (!commission.flag || commission.rate === undefined || !commission.address) {
        throw new Error(`Commission blocks must have flag, rate, and address properties. Missing in: ${JSON.stringify(commission)}`);
    }

    if (!commission.flag.startsWith('0x') || commission.flag.length !== 14) {
        throw new Error(`Invalid flag format: ${commission.flag}. Must be 0x followed by 12 hex characters`);
    }

    if (!commission.address.startsWith('0x') || commission.address.length !== 42) {
        throw new Error(`Invalid address format: ${commission.address}. Must be 0x followed by 40 hex characters`);
    }
}