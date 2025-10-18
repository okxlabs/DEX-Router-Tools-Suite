import { decodeFunctions } from '../decode_functions.js';
import { extractCommissionInfoFromCalldata } from '../decode_commission.js';
import { extractTrimInfoFromCalldata } from '../decode_trim.js';
import { FUNCTION_SELECTORS } from '../function-selectors.js';

/**
 * Resolve a single calldata segment
 * @param {string} calldata - Single calldata to decode
 * @returns {Object} Decoded result for single calldata
 */
function resolveSingle(calldata) {
    try {
        // Decode function information using the original decoder
        const decodedFunctions = decodeFunctions(calldata);
        
        // Prepare calldata for commission and trim decoding (remove 0x prefix)
        const calldataHex = calldata.replace(/^0x/, "").toLowerCase();
        
        // Decode commission information
        const commissionDecoded = extractCommissionInfoFromCalldata(calldataHex);
        
        // Decode trim information
        const trimDecoded = extractTrimInfoFromCalldata(calldataHex);
        
        // Return structured JSON with all decode results
        return {
            ...decodedFunctions,
            ...commissionDecoded,
            ...trimDecoded
        };
    } catch (error) {
        console.error('Decode error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Find all function selector positions in calldata
 * @param {string} calldata - The full calldata to search
 * @returns {Array} Array of {selector, position} objects
 */
function findFunctionSelectorPositions(calldata) {
    const positions = [];
    const calldataHex = calldata.replace(/^0x/, '').toLowerCase();
    
    // Get all function selectors (remove 0x prefix and convert to lowercase)
    const selectors = Object.values(FUNCTION_SELECTORS).map(sel => sel.replace(/^0x/, '').toLowerCase());
    
    // Search for each selector in the calldata
    selectors.forEach(selector => {
        let searchIndex = 0;
        while (searchIndex < calldataHex.length) {
            const foundIndex = calldataHex.indexOf(selector, searchIndex);
            if (foundIndex === -1) break;
            
            // Only consider positions that are at the start or aligned to 32-byte boundaries
            // Function selectors should appear at the beginning of function calls
            if (foundIndex === 0 || foundIndex % 8 === 0) {
                positions.push({
                    selector: '0x' + selector,
                    position: foundIndex
                });
            }
            searchIndex = foundIndex + selector.length;
        }
    });
    
    // Sort by position
    positions.sort((a, b) => a.position - b.position);
    
    return positions;
}

/**
 * Split calldata into multiple calldata segments based on function selectors
 * @param {string} calldata - The full calldata containing multiple function calls
 * @returns {Array} Array of individual calldata strings
 */
function splitCalldata(calldata) {
    const calldataHex = calldata.replace(/^0x/, '');
    const positions = findFunctionSelectorPositions(calldata);
    
    if (positions.length === 0) {
        return [calldata]; // Return original if no selectors found
    }
    
    if (positions.length === 1) {
        return [calldata]; // Return original if only one selector found
    }
    
    const calldataSegments = [];
    
    for (let i = 0; i < positions.length; i++) {
        const startPos = positions[i].position;
        const endPos = i < positions.length - 1 ? positions[i + 1].position : calldataHex.length;
        
        const segment = '0x' + calldataHex.slice(startPos, endPos);
        calldataSegments.push(segment);
    }
    
    return calldataSegments;
}

/**
 * Main resolve function that handles multiple calldata segments
 * @param {string} calldata - The calldata that may contain multiple function calls
 * @returns {Array} Array of decoded JSON objects, one for each calldata segment
 */
export function resolveMultipleCalldata(calldata) {
    try {
        // Split calldata into individual segments
        const calldataSegments = splitCalldata(calldata);
        
        // Process each segment
        const results = calldataSegments.map((segment, index) => {
            return resolveSingle(segment);
        });
        
        return results;
        
    } catch (error) {
        console.error('Multi-calldata decode error:', error);
        return [{
            success: false,
            error: error.message
        }];
    }
}
