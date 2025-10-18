import { ethers } from 'ethers';

/**
 * Add commission data to encoded calldata
 * @param {string} calldata - The base encoded calldata
 * @param {Object} commissionData - The commission data from JSON
 * @returns {string} Calldata with commission data appended
 */
export function addCommissionToCalldata(calldata, commissionData) {
    try {
        // Remove 0x prefix for manipulation
        let calldataHex = calldata.replace(/^0x/, '');
        
        if (commissionData.referCount === 1) {
            // SINGLE commission case
            const middleBlock = encodeMiddleBlock(commissionData.middle);
            const firstBlock = encodeCommissionBlock(commissionData.first);
            
            // Append middle block then first block
            calldataHex += middleBlock + firstBlock;
            
        } else if (commissionData.referCount === 2) {
            // DUAL commission case
            // Following the specification:
            // swap_data() + (flag + rate2 + referer_address2) + (isToB + token_address) + (flag + rate1 + referer_address1)
            //                      32 bytes                        32 bytes                    32 bytes
            
            const firstBlock = encodeCommissionBlock(commissionData.first);  // rate1
            const middleBlock = encodeMiddleBlock(commissionData.middle);    // isToB + token
            const lastBlock = encodeCommissionBlock(commissionData.last);    // rate2
            
            // Encode: first + middle + last (decoder finds first flag, looks backwards)
            calldataHex += firstBlock + middleBlock + lastBlock;
        } else {
            throw new Error(`Invalid referCount: ${commissionData.referCount}. Must be 1 or 2.`);
        }
        
        return '0x' + calldataHex;
        
    } catch (error) {
        throw new Error('Failed to encode commission data: ' + error.message);
    }
}

/**
 * Encode commission block (32 bytes)
 * @param {Object} commission - Commission object with flag, rate, address
 * @returns {string} 64-character hex string (32 bytes)
 */
function encodeCommissionBlock(commission) {
    try {
        
        // Validate required fields
        if (!commission.flag || !commission.rate || !commission.address) {
            throw new Error('Commission block missing required fields: flag, rate, address');
        }
        
        // Extract flag (6 bytes) - remove 0x prefix
        const flag = commission.flag.replace(/^0x/, '').toLowerCase().padStart(12, '0');
        
        // Convert rate to 6-byte hex - remove 0x prefix
        const rateBN = ethers.BigNumber.from(commission.rate.toString());
        const rate = rateBN.toHexString().replace(/^0x/, '').toLowerCase().padStart(12, '0');
        
        // Extract address (20 bytes) - remove 0x prefix
        const address = commission.address.replace(/^0x/, '').toLowerCase().padStart(40, '0');
        
        return flag + rate + address;
    } catch (error) {
        throw new Error(`Failed to encode commission block: ${error.message}`);
    }
}

/**
 * Encode middle block (32 bytes)
 * @param {Object} middle - Middle object with isToB/toB and token
 * @returns {string} 64-character hex string (32 bytes)
 */
function encodeMiddleBlock(middle) {
    try {
        
        // Validate required fields
        if (!middle.token) {
            throw new Error('Middle block missing required field: token');
        }
        
        // Following specification: isToB + "00"*11 + token_address
        // isToB: "80" for True, "00" for False (1 byte)
        // Handle both "isToB" and "toB" property names for compatibility
        const toBFlag = middle.isToB !== undefined ? middle.isToB : middle.toB;
        const isToB = toBFlag ? '80' : '00';
        
        // 11 bytes of padding (zeros) - as specified
        const padding = '00'.repeat(11);
        
        // Token address (20 bytes) - remove 0x prefix
        const token = middle.token.replace(/^0x/, '').toLowerCase().padStart(40, '0');
        
        return isToB + padding + token;
    } catch (error) {
        throw new Error(`Failed to encode middle block: ${error.message}`);
    }
}

/**
 * Validate commission data structure
 * @param {Object} commissionData - The commission data to validate
 * @returns {boolean} True if valid
 */
export function validateCommissionData(commissionData) {
    if (!commissionData || typeof commissionData !== 'object') {
        throw new Error('Commission data must be an object');
    }
    
    if (!commissionData.referCount || (commissionData.referCount !== 1 && commissionData.referCount !== 2)) {
        throw new Error(`Commission data must have referCount of 1 or 2, got: ${commissionData.referCount}`);
    }
    
    if (!commissionData.middle || !commissionData.first) {
        throw new Error('Commission data must have middle and first properties');
    }
    
    if (commissionData.referCount === 2 && !commissionData.last) {
        throw new Error('Dual commission data must have last property');
    }
    
    // Validate middle block
    if (!commissionData.middle.token) {
        throw new Error('Middle block must have token property');
    }
    
    // Check if middle has isToB or toB
    const hasToB = commissionData.middle.isToB !== undefined || commissionData.middle.toB !== undefined;
    if (!hasToB) {
        console.warn('Middle block missing isToB/toB property, defaulting to false');
    }
    
    // Validate commission blocks
    const commissionsToValidate = [commissionData.first];
    if (commissionData.referCount === 2) {
        commissionsToValidate.push(commissionData.last);
    }
    
    for (const commission of commissionsToValidate) {
        if (!commission.flag || !commission.rate || !commission.address) {
            throw new Error(`Commission blocks must have flag, rate, and address properties. Missing in: ${JSON.stringify(commission)}`);
        }
        
        // Validate flag format
        if (!commission.flag.startsWith('0x') || commission.flag.length !== 14) {
            throw new Error(`Invalid flag format: ${commission.flag}. Must be 0x followed by 12 hex characters`);
        }
        
        // Validate address format
        if (!commission.address.startsWith('0x') || commission.address.length !== 42) {
            throw new Error(`Invalid address format: ${commission.address}. Must be 0x followed by 40 hex characters`);
        }
    }
    
    return true;
}
