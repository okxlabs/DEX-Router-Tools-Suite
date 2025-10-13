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
        console.log('=== TRIM ENCODING START ===');
        console.log('Input calldata length:', calldata.length);
        console.log('Trim data:', JSON.stringify(trimData, null, 2));

        let calldataHex = calldata.replace(/^0x/, '');
        console.log('Base calldata hex length:', calldataHex.length);

        if (trimData.trimRate && trimData.trimAddress && trimData.expectAmountOut) {
            // Check if it's single or dual trim
            const isDualTrim = trimData.trimRate2 && trimData.trimAddress2;
            
            if (isDualTrim) {
                console.log('Processing DUAL trim...');
                
                // DUAL TRIM: 96 bytes (3 x 32-byte blocks)
                // Based on decode logic: thirdBlock + secondBlock + firstBlock
                // - thirdBlock: trim_flag + trim_rate2 + trim_address2
                // - secondBlock: trim_flag + padding + expect_amount  
                // - firstBlock: trim_flag + trim_rate1 + trim_address1
                
                const thirdBlock = encodeTrimBlock(trimData.trimRate2, trimData.trimAddress2, TRIM_FLAGS.DUAL);
                const secondBlock = encodeExpectAmountBlock(trimData.expectAmountOut, TRIM_FLAGS.DUAL);
                const firstBlock = encodeTrimBlock(trimData.trimRate, trimData.trimAddress, TRIM_FLAGS.DUAL);
                
                console.log('Third block (rate2):', thirdBlock);
                console.log('Second block (expect):', secondBlock);
                console.log('First block (rate1):', firstBlock);
                
                // Encode in order: third + second + first (decoder finds first, looks backwards)
                calldataHex += thirdBlock + secondBlock + firstBlock;
                console.log('After appending dual trim blocks, hex length:', calldataHex.length);
                
            } else {
                console.log('Processing SINGLE trim...');
                
                // SINGLE TRIM: 64 bytes (2 x 32-byte blocks)
                // Based on decode logic: expectAmountBlock + trimDataBlock
                // - expectAmountBlock: trim_flag + padding + expect_amount
                // - trimDataBlock: trim_flag + trim_rate + trim_address
                
                const expectAmountBlock = encodeExpectAmountBlock(trimData.expectAmountOut, TRIM_FLAGS.SINGLE);
                const trimDataBlock = encodeTrimBlock(trimData.trimRate, trimData.trimAddress, TRIM_FLAGS.SINGLE);
                
                console.log('Expect amount block:', expectAmountBlock);
                console.log('Trim data block:', trimDataBlock);
                
                // Encode in order: expect + trim (decoder finds trim, looks backwards for expect)
                calldataHex += expectAmountBlock + trimDataBlock;
                console.log('After appending single trim blocks, hex length:', calldataHex.length);
            }
        } else {
            throw new Error('Trim data missing required fields: trimRate, trimAddress, expectAmountOut');
        }

        const result = '0x' + calldataHex;
        console.log('=== TRIM ENCODING COMPLETE ===');
        console.log('Final calldata length:', result.length);
        console.log('Trim blocks added:', (result.length - calldata.length) / 2, 'bytes');
        console.log('Trim data starts at position:', calldata.length - 2); // -2 for 0x prefix
        const trimHex = result.slice(calldata.length);
        console.log('Trim data in final calldata:', trimHex);
        
        return result;

    } catch (error) {
        console.error('Error adding trim to calldata:', error);
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
        console.log('Encoding trim block:', { rate, address, flag });

        if (!rate || !address || !flag) {
            throw new Error('Trim block missing required fields: rate, address, flag');
        }

        const flagHex = flag.replace(/^0x/, '').toLowerCase().padStart(12, '0');
        const rateBN = ethers.BigNumber.from(rate.toString());
        const rateHex = rateBN.toHexString().replace(/^0x/, '').toLowerCase().padStart(12, '0');
        const addressHex = address.replace(/^0x/, '').toLowerCase().padStart(40, '0');

        const result = flagHex + rateHex + addressHex;
        console.log(`Trim block: flag=${flagHex}, rate=${rateHex}, address=${addressHex}`);
        console.log(`Trim block total length: ${result.length} chars (${result.length/2} bytes)`);

        return result;
    } catch (error) {
        console.error('Error encoding trim block:', error);
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
        console.log('Encoding expect amount block:', { expectAmount, flag });

        if (!expectAmount || !flag) {
            throw new Error('Expect amount block missing required fields: expectAmount, flag');
        }

        const flagHex = flag.replace(/^0x/, '').toLowerCase().padStart(12, '0');
        const padding = '00'.repeat(6); // 6 bytes padding
        const expectBN = ethers.BigNumber.from(expectAmount.toString());
        const expectHex = expectBN.toHexString().replace(/^0x/, '').toLowerCase().padStart(40, '0'); // 20 bytes

        const result = flagHex + padding + expectHex;
        console.log(`Expect block: flag=${flagHex}, padding=${padding}, expect=${expectHex}`);
        console.log(`Expect block total length: ${result.length} chars (${result.length/2} bytes)`);

        return result;
    } catch (error) {
        console.error('Error encoding expect amount block:', error);
        throw new Error(`Failed to encode expect amount block: ${error.message}`);
    }
}

/**
 * Validate trim data structure
 * @param {Object} trimData - The trim data to validate
 * @returns {boolean} True if valid
 */
export function validateTrimData(trimData) {
    console.log('Validating trim data:', JSON.stringify(trimData, null, 2));

    if (!trimData || typeof trimData !== 'object') {
        throw new Error('Trim data must be an object');
    }

    if (!trimData.trimRate || !trimData.trimAddress || !trimData.expectAmountOut) {
        throw new Error('Trim data must have trimRate, trimAddress, and expectAmountOut properties');
    }

    // Check for dual trim
    const hasTrimRate2 = trimData.trimRate2 !== undefined;
    const hasTrimAddress2 = trimData.trimAddress2 !== undefined;
    
    if (hasTrimRate2 !== hasTrimAddress2) {
        throw new Error('For dual trim, both trimRate2 and trimAddress2 must be provided');
    }

    // Validate addresses
    if (!trimData.trimAddress.startsWith('0x') || trimData.trimAddress.length !== 42) {
        throw new Error(`Invalid trimAddress format: ${trimData.trimAddress}. Must be 0x followed by 40 hex characters`);
    }

    if (hasTrimAddress2 && (!trimData.trimAddress2.startsWith('0x') || trimData.trimAddress2.length !== 42)) {
        throw new Error(`Invalid trimAddress2 format: ${trimData.trimAddress2}. Must be 0x followed by 40 hex characters`);
    }

    // Validate rates are numbers
    try {
        ethers.BigNumber.from(trimData.trimRate.toString());
        ethers.BigNumber.from(trimData.expectAmountOut.toString());
        if (hasTrimRate2) {
            ethers.BigNumber.from(trimData.trimRate2.toString());
        }
    } catch (error) {
        throw new Error(`Invalid numeric values in trim data: ${error.message}`);
    }

    console.log('Trim data validation passed');
    return true;
}
