import { ethers } from 'ethers';

// Define trim flag constants (6 bytes) - must match decode_trim.js
const TRIM_FLAGS = {
    SINGLE: "0x777777771111", // TRIM_FLAG (high 6 bytes)
    DUAL: "0x777777772222",   // TRIM_DUAL_FLAG (high 6 bytes)
};

/**
 * Add trim data to encoded calldata
 * @param {string} calldata - The base encoded calldata
 * @param {Object} trimData - The trim data from JSON
 * @returns {string} Calldata with trim data appended
 */
export function addTrimToCalldata(calldata, trimData) {
    try {
        let calldataHex = calldata.replace(/^0x/, '');

        if (trimData.trimRate && trimData.trimAddress && trimData.expectAmountOut) {
            // Check if it's single or dual trim
            // Support both old field names (trimRate2, trimAddress2) and new names (chargeRate, chargeAddress)
            const chargeRate = trimData.trimRate2 || trimData.chargeRate;
            const chargeAddress = trimData.trimAddress2 || trimData.chargeAddress;
            
            // Consider it dual trim only if both values exist AND are meaningful (non-zero)
            const isValidChargeRate = chargeRate !== undefined && chargeRate !== null && chargeRate !== 0 && chargeRate !== '0';
            const isValidChargeAddress = chargeAddress !== undefined && chargeAddress !== null && 
                chargeAddress !== '0x0000000000000000000000000000000000000000' && 
                chargeAddress !== '0x' && chargeAddress !== '';
            
            const isDualTrim = isValidChargeRate && isValidChargeAddress;
            
            if (isDualTrim) {
                // DUAL TRIM: 96 bytes (3 x 32-byte blocks)
                // Based on decode logic: thirdBlock + secondBlock + firstBlock
                // - thirdBlock: trim_flag + trim_rate2 + trim_address2
                // - secondBlock: trim_flag + padding + expect_amount  
                // - firstBlock: trim_flag + trim_rate1 + trim_address1
                
                const thirdBlock = encodeTrimBlock(chargeRate, chargeAddress, TRIM_FLAGS.DUAL);
                const secondBlock = encodeExpectAmountBlock(trimData.expectAmountOut, TRIM_FLAGS.DUAL);
                const firstBlock = encodeTrimBlock(trimData.trimRate, trimData.trimAddress, TRIM_FLAGS.DUAL);

                // Encode in order: third + second + first (decoder finds first, looks backwards)
                calldataHex += thirdBlock + secondBlock + firstBlock;
                
            } else {
                // SINGLE TRIM: 64 bytes (2 x 32-byte blocks)
                // Based on decode logic: expectAmountBlock + trimDataBlock
                // - expectAmountBlock: trim_flag + padding + expect_amount
                // - trimDataBlock: trim_flag + trim_rate + trim_address
                
                const expectAmountBlock = encodeExpectAmountBlock(trimData.expectAmountOut, TRIM_FLAGS.SINGLE);
                const trimDataBlock = encodeTrimBlock(trimData.trimRate, trimData.trimAddress, TRIM_FLAGS.SINGLE);
                // Encode in order: expect + trim (decoder finds trim, looks backwards for expect)
                calldataHex += expectAmountBlock + trimDataBlock;
            }
        } else {
            throw new Error('Trim data missing required fields: trimRate, trimAddress, expectAmountOut');
        }

        const result = '0x' + calldataHex;
        
        return result;

    } catch (error) {
        throw new Error('Failed to encode trim data: ' + error.message);
    }
}

/**
 * Encode trim block (32 bytes): flag + rate + address
 * @param {string|number} rate - Trim rate
 * @param {string} address - Trim address
 * @param {string} flag - Trim flag (SINGLE or DUAL)
 * @returns {string} 64-character hex string (32 bytes)
 */
function encodeTrimBlock(rate, address, flag) {
    try {
        if (!rate || !address || !flag) {
            throw new Error('Trim block missing required fields: rate, address, flag');
        }

        const flagHex = flag.replace(/^0x/, '').toLowerCase().padStart(12, '0');
        const rateBN = ethers.BigNumber.from(rate.toString());
        const rateHex = rateBN.toHexString().replace(/^0x/, '').toLowerCase().padStart(12, '0');
        const addressHex = address.replace(/^0x/, '').toLowerCase().padStart(40, '0');

        const result = flagHex + rateHex + addressHex;
        
        return result;
    } catch (error) {
        throw new Error(`Failed to encode trim block: ${error.message}`);
    }
}

/**
 * Encode expect amount block (32 bytes): flag + padding + expect_amount
 * @param {string|number} expectAmount - Expected amount
 * @param {string} flag - Trim flag (SINGLE or DUAL)
 * @returns {string} 64-character hex string (32 bytes)
 */
function encodeExpectAmountBlock(expectAmount, flag) {
    try {

        if (!expectAmount || !flag) {
            throw new Error('Expect amount block missing required fields: expectAmount, flag');
        }

        const flagHex = flag.replace(/^0x/, '').toLowerCase().padStart(12, '0');
        const padding = '00'.repeat(6); // 6 bytes padding
        const expectBN = ethers.BigNumber.from(expectAmount.toString());
        const expectHex = expectBN.toHexString().replace(/^0x/, '').toLowerCase().padStart(40, '0'); // 20 bytes

        const result = flagHex + padding + expectHex;

        return result;
    } catch (error) {
        throw new Error(`Failed to encode expect amount block: ${error.message}`);
    }
}

/**
 * Validate trim data structure
 * @param {Object} trimData - The trim data to validate
 * @returns {boolean} True if valid
 */
export function validateTrimData(trimData) {

    if (!trimData || typeof trimData !== 'object') {
        throw new Error('Trim data must be an object');
    }

    if (!trimData.trimRate || !trimData.trimAddress || !trimData.expectAmountOut) {
        throw new Error('Trim data must have trimRate, trimAddress, and expectAmountOut properties');
    }

    // Check for dual trim - support both old and new field names
    const chargeRate = trimData.trimRate2 || trimData.chargeRate;
    const chargeAddress = trimData.trimAddress2 || trimData.chargeAddress;
    
    // Consider it dual trim only if both values exist AND are meaningful (non-zero)
    const isValidChargeRate = chargeRate !== undefined && chargeRate !== null && chargeRate !== 0 && chargeRate !== '0';
    const isValidChargeAddress = chargeAddress !== undefined && chargeAddress !== null && 
        chargeAddress !== '0x0000000000000000000000000000000000000000' && 
        chargeAddress !== '0x' && chargeAddress !== '';
    
    const hasDualTrim = isValidChargeRate && isValidChargeAddress;
    
    // If one is provided but not valid, or only one is provided, that's an error for dual trim intent
    const hasChargeRateField = chargeRate !== undefined && chargeRate !== null;
    const hasChargeAddressField = chargeAddress !== undefined && chargeAddress !== null;
    
    if ((hasChargeRateField || hasChargeAddressField) && !hasDualTrim) {
        if (!isValidChargeRate && hasChargeRateField) {
            // chargeRate is provided but is 0 or '0' - this is valid for single trim
        } else if (!isValidChargeAddress && hasChargeAddressField) {
            // chargeAddress is provided but is zero address - this is valid for single trim  
        } else if (hasChargeRateField !== hasChargeAddressField) {
            throw new Error('For dual trim, both chargeRate/trimRate2 and chargeAddress/trimAddress2 must be provided');
        }
    }

    // Validate addresses
    if (!trimData.trimAddress.startsWith('0x') || trimData.trimAddress.length !== 42) {
        throw new Error(`Invalid trimAddress format: ${trimData.trimAddress}. Must be 0x followed by 40 hex characters`);
    }

    if (hasDualTrim && (!chargeAddress.startsWith('0x') || chargeAddress.length !== 42)) {
        throw new Error(`Invalid chargeAddress/trimAddress2 format: ${chargeAddress}. Must be 0x followed by 40 hex characters`);
    }

    // Validate rates are numbers
    try {
        ethers.BigNumber.from(trimData.trimRate.toString());
        ethers.BigNumber.from(trimData.expectAmountOut.toString());
        if (hasDualTrim) {
            ethers.BigNumber.from(chargeRate.toString());
        }
    } catch (error) {
        throw new Error(`Invalid numeric values in trim data: ${error.message}`);
    }

    return true;
}

