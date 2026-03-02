import { decodeFunctions } from './decode_functions.js';
import { extractCommissionInfoFromCalldata } from './decode_commission.js';
import { extractTrimInfoFromCalldata } from './decode_trim.js';

export function resolve(calldata) {
    try {
        // Decode function information using the original decoder
        const decodedFunctions = decodeFunctions(calldata);
        
        const functionName = decodedFunctions.function?.name;
        const isNonSwapFunction = functionName === 'approve';

        // Extract orderId for functions that have it embedded in parameters
        let orderId = null;
        if ((functionName === 'unxswapTo' || functionName === 'unxswapByOrderId') && 
            decodedFunctions.srcToken && decodedFunctions.srcToken.orderId) {
            orderId = decodedFunctions.srcToken.orderId;
            decodedFunctions.srcToken = decodedFunctions.srcToken.address;
        }
        else if (functionName === 'uniswapV3SwapTo' && 
                 decodedFunctions.receiver && decodedFunctions.receiver.orderId) {
            orderId = decodedFunctions.receiver.orderId;
            decodedFunctions.receiver = decodedFunctions.receiver.address;
        }

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
        if (functionName === 'unxswapToWithBaseRequest' && 
            result.baseRequest && result.baseRequest.fromTokenAddr) {
            result.fromTokenAddr = result.baseRequest.fromTokenAddr;
        }
        
        // Commission and trim only apply to swap functions
        if (!isNonSwapFunction) {
            const commissionDecoded = extractCommissionInfoFromCalldata(calldata);
            const trimDecoded = extractTrimInfoFromCalldata(calldata);
            Object.assign(result, commissionDecoded, trimDecoded);
        }
        
        return result;
    } catch (error) {
        console.error('Decode error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
