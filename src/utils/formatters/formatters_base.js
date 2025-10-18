import { ethers } from 'ethers';

/**
 * Convert ethers BigNumbers to strings and process nested data structures
 * @param {any} value - the value to convert
 * @returns {any} converted value
 */
function getValue(value) {
    // Handle BigNumber objects
    if (value && value._isBigNumber) {
        const hexStr = value.toHexString();
        
        // If it looks like an address (20 bytes), convert to address format
        if (hexStr.length === 42) { // 0x + 40 chars = 42 total
            return hexStr;
        }
        
        // For large numbers, return decimal string
        return value.toString();
    }
    
    // Handle arrays recursively
    if (Array.isArray(value)) {
        return value.map(item => getValue(item));
    }
    
    // Handle objects recursively
    if (value && typeof value === 'object' && value.constructor === Object) {
        const cleaned = {};
        for (const [key, val] of Object.entries(value)) {
            cleaned[key] = getValue(val);
        }
        return cleaned;
    }
    
    // Return primitive values as-is
    return value;
}

/**
 * Format BaseRequest tuple with named fields
 * @param {Array} baseRequestArray - the BaseRequest tuple as array
 * @returns {Object} formatted BaseRequest with field names
 */
function formatBaseRequest(baseRequestArray) {
    const [fromToken, toToken, fromTokenAmount, minReturnAmount, deadLine] = baseRequestArray;
    
    return {
        fromToken: getValue(fromToken),
        toToken: getValue(toToken),
        fromTokenAmount: getValue(fromTokenAmount),
        minReturnAmount: getValue(minReturnAmount),
        deadLine: getValue(deadLine)
    };
}

export {
    getValue,
    formatBaseRequest
};
