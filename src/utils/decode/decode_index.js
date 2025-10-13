import { decodeFunctions } from './decode_functions.js';
import { extractCommissionInfoFromCalldata } from './decode_commission.js';
import { extractTrimInfoFromCalldata } from './decode_trim.js';

export function resolve(calldata) {
    try {
        console.log('Resolving calldata:', calldata.slice(0, 10)); // Log function selector
        
        // Decode function information using the original decoder
        const decodedFunctions = decodeFunctions(calldata);
        
        // Check if this is an ERC20 or utility function (doesn't need commission/trim processing)
        const isERC20Function = decodedFunctions.function && 
            ['approve', 'swapWrap'].includes(decodedFunctions.function.name);
        
        if (isERC20Function) {
            // For ERC20 functions, return only the decoded function data
            return decodedFunctions;
        }
        
        // For DEX router functions, decode commission and trim data
        const commissionDecoded = extractCommissionInfoFromCalldata(calldata);
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
