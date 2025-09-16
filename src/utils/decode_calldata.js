import { decodeFunctions } from './decode_functions.js';
import { extractCommissionInfoFromCalldata } from './decode_commission.js';
import { extractTrimInfoFromCalldata } from './decode_trim.js';

export function resolve(calldata) {
    try {
        console.log('Resolving calldata:', calldata.slice(0, 10)); // Log function selector
        const decoded = decodeFunctions(calldata);
        console.log('Decoded result:', decoded);
        const commissionInfo = extractCommissionInfoFromCalldata(calldata);
        const trimInfo = extractTrimInfoFromCalldata(calldata);
        
        // Return structured JSON instead of console logging
        return {
            ...decoded,  // Spread decoded data at top level
            commissionInfo: commissionInfo,
            trimInfo: trimInfo
        };
    } catch (error) {
        console.error('Decode error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
