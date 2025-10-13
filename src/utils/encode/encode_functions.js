import { ethers } from 'ethers';
import { DEXROUTER_ABI } from '../core/abi.js';
import {
    prepareSmartSwapByOrderIdParams,
    prepareSmartSwapByInvestParams,
    prepareSmartSwapByInvestWithRefundParams,
    prepareUniswapV3SwapToParams,
    prepareSmartSwapToParams,
    prepareUnxswapByOrderIdParams,
    prepareUnxswapToParams,
    prepareUniswapV3SwapToWithBaseRequestParams,
    prepareUnxswapToWithBaseRequestParams,
    prepareSwapWrapParams,
    prepareSwapWrapToWithBaseRequestParams,
    prepareDagSwapByOrderIdParams,
    prepareDagSwapToParams
} from '../formatters/encode_parameters.js';

// Initialize interface once
const contractInterface = new ethers.utils.Interface(DEXROUTER_ABI);

/**
 * Encode function parameters to calldata
 * @param {Object} jsonData - The JSON data containing function and parameters
 * @returns {string} The encoded calldata
 */
export function encodeFunctions(jsonData) {
    try {
        // Validate input
        if (!jsonData || !jsonData.function) {
            throw new Error('Invalid input: missing function information');
        }

        const { function: funcInfo } = jsonData;
        
        if (!funcInfo.name || !funcInfo.selector) {
            throw new Error('Invalid function information: missing name or selector');
        }

        // Find the function fragment
        const fragment = contractInterface.getFunction(funcInfo.name);
        if (!fragment) {
            throw new Error(`Function ${funcInfo.name} not found in ABI`);
        }

        // Prepare parameters based on function type
        const params = prepareParameters(jsonData, fragment);
        
        // Encode the function call
        const encodedCalldata = contractInterface.encodeFunctionData(fragment, params);
        
        return encodedCalldata;
        
    } catch (error) {
        throw new Error(`Function encoding failed: ${error.message}`);
    }
}

/**
 * Prepare parameters for encoding based on function signature
 * @param {Object} jsonData - The JSON data
 * @param {Object} fragment - The function fragment from ABI
 * @returns {Array} Array of parameters ready for encoding
 */
function prepareParameters(jsonData, fragment) {
    // Handle different function types
    switch (fragment.name) {
        case 'smartSwapByOrderId':
            return prepareSmartSwapByOrderIdParams(jsonData);
        case 'smartSwapByInvest':
            return prepareSmartSwapByInvestParams(jsonData);
        case 'smartSwapByInvestWithRefund':
            return prepareSmartSwapByInvestWithRefundParams(jsonData);
        case 'uniswapV3SwapTo':
            return prepareUniswapV3SwapToParams(jsonData);
        case 'smartSwapTo':
            return prepareSmartSwapToParams(jsonData);
        case 'unxswapByOrderId':
            return prepareUnxswapByOrderIdParams(jsonData);
        case 'unxswapTo':
            return prepareUnxswapToParams(jsonData);
        case 'uniswapV3SwapToWithBaseRequest':
            return prepareUniswapV3SwapToWithBaseRequestParams(jsonData);
        case 'unxswapToWithBaseRequest':
            return prepareUnxswapToWithBaseRequestParams(jsonData);
        case 'swapWrap':
            return prepareSwapWrapParams(jsonData);
        case 'swapWrapToWithBaseRequest':
            return prepareSwapWrapToWithBaseRequestParams(jsonData);
        case 'dagSwapByOrderId':
            return prepareDagSwapByOrderIdParams(jsonData);
        case 'dagSwapTo':
            return prepareDagSwapToParams(jsonData);
        default:
            throw new Error(`Unsupported function: ${fragment.name}`);
    }
}