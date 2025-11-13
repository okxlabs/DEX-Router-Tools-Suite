import { ethers } from 'ethers';

// Constants for encoding
const BYTE_SIZE = {
    FLAG: 12,        // 6 bytes = 12 hex chars
    RATE: 12,        // 6 bytes = 12 hex chars
    ADDRESS: 40,     // 20 bytes = 40 hex chars
    BLOCK: 64,       // 32 bytes = 64 hex chars
};

const PADDING = '00'.repeat(11); // 11 bytes of padding for middle block

// Commission structure mapping
const COMMISSION_STRUCTURE = {
    1: { blocks: ['middle', 'first'], name: 'SINGLE' },
    2: { blocks: ['first', 'middle', 'second'], name: 'DUAL' },
    3: { blocks: ['first', 'second', 'middle', 'third'], name: 'TRIPLE' },
};

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
 * Encode middle block (32 bytes): isToB + padding + token address
 */
function encodeMiddleBlock(middle) {
    if (!middle.token) {
        throw new Error('Middle block missing required field: token');
    }

    const toBFlag = middle.isToB !== undefined ? middle.isToB : middle.toB;
    const isToB = toBFlag ? '80' : '00';
    const token = normalizeHex(middle.token, BYTE_SIZE.ADDRESS);

    return isToB + PADDING + token;
}

/**
 * Add commission data to encoded calldata
 */
export function addCommissionToCalldata(calldata, commissionData) {
    try {
        validateCommissionData(commissionData);

        let calldataHex = calldata.replace(/^0x/, '');
        const structure = COMMISSION_STRUCTURE[commissionData.referCount];

        // Encode blocks according to structure
        const encodedBlocks = structure.blocks.map(blockType => {
            if (blockType === 'middle') {
                return encodeMiddleBlock(commissionData.middle);
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
    if (!referCount || !COMMISSION_STRUCTURE[referCount]) {
        throw new Error(`Commission data must have referCount of 1, 2, or 3, got: ${referCount}`);
    }

    // Check required properties
    if (!commissionData.middle || !commissionData.first) {
        throw new Error('Commission data must have middle and first properties');
    }

    if (referCount === 2 && !commissionData.second) {
        throw new Error('Dual commission data must have second property');
    }

    if (referCount === 3 && (!commissionData.second || !commissionData.third)) {
        throw new Error('Triple commission data must have second and third properties');
    }

    // Validate middle block
    if (!commissionData.middle.token) {
        throw new Error('Middle block must have token property');
    }

    // Validate commission blocks
    const commissionsToValidate = [commissionData.first];
    if (referCount === 2) {
        commissionsToValidate.push(commissionData.second);
    }
    if (referCount === 3) {
        commissionsToValidate.push(commissionData.second, commissionData.third);
    }

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