import { decodeFunctions } from './decode_functions.js';
import { extractCommissionInfoFromCalldata } from './decode_commission.js';
import { extractTrimInfoFromCalldata } from './decode_trim.js';

export function resolve(calldata) {
    try {
        // Decode function information using the original decoder
        const decodedFunctions = decodeFunctions(calldata);
        
        // Extract orderId for functions that have it embedded in parameters
        let orderId = null;
        if (decodedFunctions.function) {
            const functionName = decodedFunctions.function.name;
            
            // For unxswapTo and unxswapByOrderId, orderId is in srcToken
            if ((functionName === 'unxswapTo' || functionName === 'unxswapByOrderId') && 
                decodedFunctions.srcToken && decodedFunctions.srcToken.orderId) {
                orderId = decodedFunctions.srcToken.orderId;
                // Convert srcToken from object to just address string
                decodedFunctions.srcToken = decodedFunctions.srcToken.address;
            }
            // For uniswapV3SwapTo, orderId is in receiver
            else if (functionName === 'uniswapV3SwapTo' && 
                     decodedFunctions.receiver && decodedFunctions.receiver.orderId) {
                orderId = decodedFunctions.receiver.orderId;
                // Remove orderId from receiver to avoid duplication
                delete decodedFunctions.receiver.orderId;
            }
        }
        
        // For DEX router functions, decode commission and trim data
        const commissionDecoded = extractCommissionInfoFromCalldata(calldata);
        const trimDecoded = extractTrimInfoFromCalldata(calldata);
        
        // Build result with orderId positioned after function field
        const result = {
            function: decodedFunctions.function
        };
        
        // Add orderId right after function if found
        if (orderId !== null) {
            result.orderId = orderId;
        }
        
        // Add remaining decoded function data (excluding function field)
        const { function: _, ...remainingFunctionData } = decodedFunctions;
        Object.assign(result, remainingFunctionData);
        
        // For unxswapToWithBaseRequest, extract fromTokenAddr from baseRequest
        if (decodedFunctions.function && 
            decodedFunctions.function.name === 'unxswapToWithBaseRequest' && 
            result.baseRequest && result.baseRequest.fromTokenAddr) {
            result.fromTokenAddr = result.baseRequest.fromTokenAddr;
        }
        
        // Add commission and trim data
        Object.assign(result, commissionDecoded, trimDecoded);
        
        return result;
    } catch (error) {
        console.error('Decode error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
