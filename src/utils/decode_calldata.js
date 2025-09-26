const { decodeFunctions } = require('./decode_functions.js');
const { extractCommissionInfoFromCalldata } = require('./decode_commission.js');
const { extractTrimInfoFromCalldata } = require('./decode_trim.js');

export function resolve(calldata) {
    try {
        console.log('Resolving calldata:', calldata.slice(0, 10)); // Log function selector
        
        // Decode function information using the original decoder
        const decodedFunctions = decodeFunctions(calldata);
        
        // Decode multiple commission occurrences using the new decoder
        const commissionDecoded = extractCommissionInfoFromCalldata(calldata);
        
        // Decode multiple trim occurrences using the new decoder
        const trimDecoded = extractTrimInfoFromCalldata(calldata);
        
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
