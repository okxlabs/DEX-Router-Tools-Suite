/**
 * Validation functions for encode/decode roundtrip testing
 * Ensures data integrity between encoding and decoding operations
 */

import { resolve } from '../decode/decode_index.js';
import { encode } from '../encode/encode_index.js';

/**
 * Validate encoded calldata by decoding it back and comparing with original JSON
 * @param {Object} originalJson - The original input JSON used for encoding
 * @param {string} encodedCalldata - The encoded calldata result
 * @returns {Object} Validation result with success status and details
 */
export function validateEncodedCalldata(originalJson, encodedCalldata) {
    try {
        // Decode the encoded calldata
        const decodedResult = resolve(encodedCalldata);
        
        // Check if decoding was successful
        if (!decodedResult || decodedResult.success === false) {
            return createFailureResult('Failed to decode the encoded calldata', decodedResult?.error);
        }
        
        // Compare the decoded result with original JSON
        const comparison = compareJsonStructures(originalJson, decodedResult);
        
        return {
            success: comparison.matches,
            matches: comparison.matches,
            differences: comparison.differences,
            decodedResult: decodedResult,
            summary: comparison.matches 
                ? '✅ Perfect match! Encoded calldata decodes back to original JSON.'
                : '❌ Validation failed: Decoded JSON doesn\'t match original input.'
        };
        
    } catch (error) {
        return createFailureResult('Validation failed with exception', error.message);
    }
}

/**
 * Validate decoded JSON by encoding it back and comparing with original calldata
 * @param {string} originalCalldata - The original calldata used for decoding
 * @param {Object} decodedJson - The decoded JSON result
 * @returns {Object} Validation result with success status and details
 */
export function validateDecodedJson(originalCalldata, decodedJson) {
    try {
        // Check if decoding was successful
        if (!decodedJson || decodedJson.success === false) {
            return createFailureResult('Decoded JSON is invalid or contains errors', decodedJson?.error);
        }
        
        // Encode the decoded JSON back to calldata
        const reEncodedCalldata = encode(decodedJson);
        
        // Normalize both calldata strings for comparison
        const normalizedOriginal = normalizeCalldata(originalCalldata);
        const normalizedReEncoded = normalizeCalldata(reEncodedCalldata);
        
        const matches = normalizedOriginal === normalizedReEncoded;
        
        return {
            success: matches,
            matches: matches,
            originalCalldata: normalizedOriginal,
            reEncodedCalldata: normalizedReEncoded,
            decodedJson: decodedJson,
            summary: matches 
                ? '✅ Perfect match! Decoded JSON encodes back to original calldata.'
                : '❌ Validation failed: The decoded JSON doesn\'t encode back to original calldata.'
        };
        
    } catch (error) {
        return createFailureResult('Reverse validation failed with exception', error.message);
    }
}

/**
 * Compare two JSON structures and identify differences
 * @param {Object} original - Original input JSON
 * @param {Object} decoded - Decoded result JSON
 * @returns {Object} Comparison result
 */
function compareJsonStructures(original, decoded) {
    const differences = [];
    let matches = true;
    
    // Core function comparison
    if (!compareFunctionInfo(original.function, decoded.function)) {
        matches = false;
        differences.push('Function information mismatch');
    }
    
    // Parameter comparison (excluding commission/trim flags)
    if (!compareParameters(original, decoded)) {
        matches = false;
        differences.push('Parameter values mismatch');
    }
    
    // Commission comparison
    if (!compareCommissionData(original, decoded)) {
        matches = false;
        differences.push('Commission data mismatch');
    }
    
    // Trim comparison
    if (!compareTrimData(original, decoded)) {
        matches = false;
        differences.push('Trim data mismatch');
    }
    
    return { matches, differences };
}

/**
 * Compare function information
 * @param {Object} original - Original function info
 * @param {Object} decoded - Decoded function info
 * @returns {boolean} true if functions match
 */
function compareFunctionInfo(original, decoded) {
    if (!original || !decoded) return false;
    return original.name === decoded.name && original.selector === decoded.selector;
}

/**
 * Compare function parameters (excluding commission/trim metadata)
 * @param {Object} original - Original JSON
 * @param {Object} decoded - Decoded JSON
 * @returns {boolean} true if parameters match
 */
function compareParameters(original, decoded) {
    const fieldsToCompare = getParameterFieldsForFunction(original.function?.name);
    
    for (const field of fieldsToCompare) {
        if (!compareField(original[field], decoded[field])) {
            return false;
        }
    }
    
    return true;
}

/**
 * Compare commission data
 * @param {Object} original - Original JSON
 * @param {Object} decoded - Decoded JSON
 * @returns {boolean} true if commission data matches
 */
function compareCommissionData(original, decoded) {
    // Check hasCommission flag
    if (original.hasCommission !== decoded.hasCommission) {
        return false;
    }
    
    if (original.hasCommission && decoded.hasCommission) {
        const commissionFields = ['referCount', 'first', 'middle', 'last'];
        for (const field of commissionFields) {
            if (original[field] !== undefined || decoded[field] !== undefined) {
                if (!compareField(original[field], decoded[field])) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

/**
 * Compare trim data
 * @param {Object} original - Original JSON
 * @param {Object} decoded - Decoded JSON
 * @returns {boolean} true if trim data matches
 */
function compareTrimData(original, decoded) {
    // Check hasTrim flag
    return original.hasTrim === decoded.hasTrim;
}

/**
 * Get parameter fields to compare for each function type
 * @param {string} functionName - Name of the function
 * @returns {Array} Array of field names to compare
 */
function getParameterFieldsForFunction(functionName) {
    const commonFields = ['orderId', 'baseRequest', 'batchesAmount', 'batches', 'extraData'];
    const specificFields = {
        'smartSwapByOrderId': commonFields,
        'smartSwapTo': [...commonFields, 'receiver'],
        'smartSwapByInvest': [...commonFields.slice(1), 'to'], // No orderId
        'smartSwapByInvestWithRefund': [...commonFields.slice(1), 'to', 'refundTo'],
        'uniswapV3SwapTo': ['receiver', 'amount', 'minReturn', 'pools'],
        'uniswapV3SwapToWithBaseRequest': ['orderId', 'receiver', 'baseRequest', 'pools'],
        'unxswapByOrderId': ['srcToken', 'amount', 'minReturn', 'pools'],
        'unxswapTo': ['srcToken', 'amount', 'minReturn', 'receiver', 'pools'],
        'unxswapToWithBaseRequest': ['orderId', 'receiver', 'baseRequest', 'pools'],
        'swapWrap': ['orderId', 'rawdata'],
        'swapWrapToWithBaseRequest': ['orderId', 'receiver', 'baseRequest'],
        'dagSwapByOrderId': ['orderId', 'baseRequest', 'paths'],
        'dagSwapTo': ['orderId', 'receiver', 'baseRequest', 'paths']
    };
    
    return specificFields[functionName] || [];
}

/**
 * Compare a specific field with tolerance for different data types
 * @param {any} original - Original value
 * @param {any} decoded - Decoded value
 * @returns {boolean} true if values match
 */
function compareField(original, decoded) {
    if (original === undefined && decoded === undefined) return true;
    if (original === undefined || decoded === undefined) return false;
    
    // Deep comparison for objects and arrays
    if (typeof original === 'object' && typeof decoded === 'object') {
        return compareObjectsDeep(original, decoded);
    }
    
    // String comparison with normalization
    return normalizeValue(original) === normalizeValue(decoded);
}

/**
 * Deep comparison for objects and arrays
 * @param {Object|Array} original - Original value
 * @param {Object|Array} decoded - Decoded value
 * @returns {boolean} true if objects match
 */
function compareObjectsDeep(original, decoded) {
    if (Array.isArray(original) !== Array.isArray(decoded)) return false;
    
    if (Array.isArray(original)) {
        if (original.length !== decoded.length) return false;
        return original.every((item, index) => compareField(item, decoded[index]));
    }
    
    // Object comparison
    const originalKeys = Object.keys(original);
    const decodedKeys = Object.keys(decoded);
    
    if (originalKeys.length !== decodedKeys.length) return false;
    
    return originalKeys.every(key => 
        decodedKeys.includes(key) && compareField(original[key], decoded[key])
    );
}

/**
 * Normalize values for comparison (handle string vs number, case sensitivity, etc.)
 * @param {any} value - Value to normalize
 * @returns {any} Normalized value
 */
function normalizeValue(value) {
    if (typeof value === 'string' && value.startsWith('0x')) {
        return value.toLowerCase();
    }
    return value;
}

/**
 * Normalize calldata for comparison (remove 0x prefix, convert to lowercase)
 * @param {string} calldata - Raw calldata string
 * @returns {string} Normalized calldata
 */
function normalizeCalldata(calldata) {
    if (!calldata || typeof calldata !== 'string') return '';
    return calldata.toLowerCase().replace(/^0x/, '');
}

/**
 * Create a standardized failure result
 * @param {string} error - Error message
 * @param {string} details - Additional error details
 * @returns {Object} Failure result object
 */
function createFailureResult(error, details) {
    return {
        success: false,
        error: error,
        details: details || 'Unknown error',
        summary: `❌ Validation failed: ${error}`
    };
}