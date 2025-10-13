import { ethers } from 'ethers';

/**
 * Add commission data to encoded calldata
 * @param {string} calldata - The base encoded calldata
 * @param {Object} commissionData - The commission data from JSON
 * @returns {string} Calldata with commission data appended
 */
export function addCommissionToCalldata(calldata, commissionData) {
    try {
        console.log('=== COMMISSION ENCODING START ===');
        console.log('Input calldata length:', calldata.length);
        console.log('Commission referCount:', commissionData.referCount);
        
        // Remove 0x prefix for manipulation
        let calldataHex = calldata.replace(/^0x/, '');
        console.log('Base calldata hex length:', calldataHex.length);
        
        if (commissionData.referCount === 1) {
            // SINGLE commission case
            console.log('Processing SINGLE commission...');
            const middleBlock = encodeMiddleBlock(commissionData.middle);
            const firstBlock = encodeCommissionBlock(commissionData.first);
            
            console.log('Middle block:', middleBlock);
            console.log('First block:', firstBlock);
            
            // Append middle block then first block
            calldataHex += middleBlock + firstBlock;
            console.log('After appending blocks, hex length:', calldataHex.length);
            
        } else if (commissionData.referCount === 2) {
            // DUAL commission case
            console.log('Processing DUAL commission...');
            
            // Following the specification:
            // swap_data() + (flag + rate2 + referer_address2) + (isToB + token_address) + (flag + rate1 + referer_address1)
            //                      32 bytes                        32 bytes                    32 bytes
            
            const firstBlock = encodeCommissionBlock(commissionData.first);  // rate1
            const middleBlock = encodeMiddleBlock(commissionData.middle);    // isToB + token
            const lastBlock = encodeCommissionBlock(commissionData.last);    // rate2
            
            console.log('🔍 DUAL COMMISSION MAPPING:');
            console.log('First block (rate1):', firstBlock);
            console.log('  - Flag:', commissionData.first.flag);
            console.log('  - Rate1:', commissionData.first.rate);
            console.log('  - Address1:', commissionData.first.address);
            console.log('Middle block (isToB+token):', middleBlock);
            console.log('  - isToB:', commissionData.middle.isToB);
            console.log('  - Token:', commissionData.middle.token);
            console.log('Last block (rate2):', lastBlock);
            console.log('  - Flag:', commissionData.last.flag);
            console.log('  - Rate2:', commissionData.last.rate);
            console.log('  - Address2:', commissionData.last.address);
            
            // Encode: first + middle + last (decoder finds first flag, looks backwards)
            calldataHex += firstBlock + middleBlock + lastBlock;
            console.log('After appending commission blocks, hex length:', calldataHex.length);
        } else {
            throw new Error(`Invalid referCount: ${commissionData.referCount}. Must be 1 or 2.`);
        }
        
        const result = '0x' + calldataHex;
        console.log('=== COMMISSION ENCODING COMPLETE ===');
        console.log('Final calldata length:', result.length);
        console.log('Commission blocks added:', (result.length - calldata.length) / 2, 'bytes');
        console.log('Commission data starts at position:', calldata.length - 2); // -2 for 0x prefix
        const commissionHex = result.slice(calldata.length);
        console.log('Commission data in final calldata:', commissionHex);
        
        if (commissionData.referCount === 2) {
            console.log('📋 DUAL COMMISSION BREAKDOWN:');
            console.log('Block 1 (32 bytes):', commissionHex.slice(0, 64));
            console.log('Block 2 (32 bytes):', commissionHex.slice(64, 128));  
            console.log('Block 3 (32 bytes):', commissionHex.slice(128, 192));
            console.log('Total commission length:', commissionHex.length, 'chars =', commissionHex.length/2, 'bytes');
        }
        
        return result;
        
    } catch (error) {
        console.error('Error adding commission to calldata:', error);
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
        console.log('Encoding commission block:', commission.commissionType);
        
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
        
        const result = flag + rate + address;
        console.log(`Commission block: flag=${flag}, rate=${rate}, address=${address}`);
        
        return result;
    } catch (error) {
        console.error('Error encoding commission block:', error);
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
        console.log('Encoding middle block:', middle);
        
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
        
        const result = isToB + padding + token;
        console.log(`Middle block: isToB=${isToB}, padding=11*00, token=${token}`);
        console.log(`Middle block total length: ${result.length} chars (${result.length/2} bytes)`);
        
        return result;
    } catch (error) {
        console.error('Error encoding middle block:', error);
        throw new Error(`Failed to encode middle block: ${error.message}`);
    }
}

/**
 * Validate commission data structure
 * @param {Object} commissionData - The commission data to validate
 * @returns {boolean} True if valid
 */
export function validateCommissionData(commissionData) {
    console.log('Validating commission data:', JSON.stringify(commissionData, null, 2));
    
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
    
    console.log('Commission data validation passed');
    return true;
}
