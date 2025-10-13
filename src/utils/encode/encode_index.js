import { encodeFunctions } from './encode_functions.js';
import { addCommissionToCalldata, validateCommissionData } from './encode_commission.js';
import { addTrimToCalldata, validateTrimData } from './encode_trim.js';

/**
 * Main encode entry point - orchestrates all encoding functionality
 * @param {Object} jsonData - The JSON object from decode_calldata
 * @returns {string} The encoded calldata string
 */
export function encode(jsonData) {
    try {
        console.log('Starting encode process for function:', jsonData.function?.name);
        
        // Step 1: Encode the basic function parameters
        let encodedCalldata = encodeFunctions(jsonData);
        
        // Step 2: Add commission encoding (when needed)
        console.log('🔍 CHECKING COMMISSION DATA:');
        console.log('hasCommission:', jsonData.hasCommission);
        console.log('referCount:', jsonData.referCount);
        
        if (jsonData.hasCommission) {
            console.log('✅ Commission data detected, validating...');
            console.log('Original calldata length:', encodedCalldata.length);
            console.log('Commission structure:', {
                hasCommission: jsonData.hasCommission,
                referCount: jsonData.referCount,
                first: jsonData.first ? 'present' : 'missing',
                middle: jsonData.middle ? 'present' : 'missing', 
                last: jsonData.last ? 'present' : 'missing'
            });
            
            validateCommissionData(jsonData);
            const originalCalldata = encodedCalldata;
            encodedCalldata = addCommissionToCalldata(encodedCalldata, jsonData);
            console.log('After commission - calldata length:', encodedCalldata.length);
            console.log('Length difference:', encodedCalldata.length - originalCalldata.length, 'characters');
        } else {
            console.log('❌ No commission data detected (hasCommission:', jsonData.hasCommission, ')');
        }
        
        // Step 3: Add trim encoding (when needed)
        console.log('🔍 CHECKING TRIM DATA:');
        console.log('hasTrim:', jsonData.hasTrim);
        
        if (jsonData.hasTrim) {
            console.log('✅ Trim data detected, validating...');
            console.log('Original calldata length:', encodedCalldata.length);
            console.log('Trim structure:', {
                hasTrim: jsonData.hasTrim,
                trimRate: jsonData.trimRate ? 'present' : 'missing',
                trimAddress: jsonData.trimAddress ? 'present' : 'missing',
                expectAmountOut: jsonData.expectAmountOut ? 'present' : 'missing',
                trimRate2: jsonData.trimRate2 ? 'present' : 'missing',
                trimAddress2: jsonData.trimAddress2 ? 'present' : 'missing'
            });
            
            validateTrimData(jsonData);
            const originalCalldata = encodedCalldata;
            encodedCalldata = addTrimToCalldata(encodedCalldata, jsonData);
            console.log('After trim - calldata length:', encodedCalldata.length);
            console.log('Length difference:', encodedCalldata.length - originalCalldata.length, 'characters');
        } else {
            console.log('❌ No trim data detected (hasTrim:', jsonData.hasTrim, ')');
        }
        
        console.log('Encode process completed successfully');
        return encodedCalldata;
        
    } catch (error) {
        console.error('Encode process failed:', error);
        throw new Error(error.message);
    }
}
