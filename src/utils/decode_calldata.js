const { decodeFunctions } = require('./decode_functions.js');
const { decodeMultipleCommissionsFromCalldata } = require('./decode_multi_commission.js');
const { decodeMultipleTrimsFromCalldata } = require('./decode_multi_trim.js');

export function resolve(calldata) {
    try {
        console.log('Resolving calldata:', calldata.slice(0, 10)); // Log function selector
        
        // Decode function information using the original decoder
        const decodedFunctions = decodeFunctions(calldata);
        
        // Decode multiple commission occurrences using the new decoder
        const multiCommissionDecoded = decodeMultipleCommissionsFromCalldata(calldata);
        
        // Decode multiple trim occurrences using the new decoder
        const multiTrimDecoded = decodeMultipleTrimsFromCalldata(calldata);
        
        // Keep existing trim functionality
        // const trimInfo = extractTrimInfoFromCalldata(calldata);
        
        // Return structured JSON with all decode results
        return {
            ...decodedFunctions,
            ...multiCommissionDecoded,
            ...multiTrimDecoded
        };
    } catch (error) {
        console.error('Decode error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
