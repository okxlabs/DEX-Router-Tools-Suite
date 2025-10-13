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
        
        // Step 1: Encode the basic function parameters
        let encodedCalldata = encodeFunctions(jsonData);
        
        // Step 2: Add commission encoding (when needed)
        if (jsonData.hasCommission) {
            validateCommissionData(jsonData);
            encodedCalldata = addCommissionToCalldata(encodedCalldata, jsonData);
        }
        
        // Step 3: Add trim encoding (when needed)
        if (jsonData.hasTrim) {
            validateTrimData(jsonData);
            encodedCalldata = addTrimToCalldata(encodedCalldata, jsonData);
        }
        return encodedCalldata;
        
    } catch (error) {
        throw new Error(error.message);
    }
}
