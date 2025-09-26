import { ethers } from 'ethers';
import { DEXROUTER_ABI } from './dexrouter-abi.js';
import {
    isBaseRequestTuple,
    isRouterPathArray,
    isPackedReceiver,
    isPoolsArray,
    isPackedSrcToken,
    isSwapWrapRawdata
} from './validation.js';
import {
    getValue,
    formatBaseRequest,
    formatRouterPathArray,
    unpackReceiver,
    unpackPoolsArray,
    unpackSrcToken,
    unpackSwapRawdata
} from './formatters.js';

// Initialize interface and function selectors once
const contractInterface = new ethers.utils.Interface(DEXROUTER_ABI);
const functionSelectors = new Map();

// Initialize the function selectors mapping
Object.values(contractInterface.functions).forEach(fragment => {
    const selector = contractInterface.getSighash(fragment);
    functionSelectors.set(selector, fragment);
});

/**
 * Decode transaction calldata
 * @param {string} calldata - the input data of the transaction (0x prefixed hexadecimal string)
 * @returns {Object} the decoded result
 */
function decodeFunctions(calldata) {
    try {
        // Validate the input
        if (!calldata || typeof calldata !== 'string') {
            return createErrorResult('Invalid calldata input');
        }
        
        // Ensure the calldata starts with 0x
        if (!calldata.startsWith('0x')) {
            calldata = '0x' + calldata;
        }
        
        // Check the length (at least needs the function selector)
        if (calldata.length < 10) {
            return createErrorResult('calldata length is too short');
        }
        
        // Extract the function selector (first 4 bytes)
        const selector = calldata.slice(0, 10);
        const fragment = functionSelectors.get(selector);
        
        if (!fragment) {
            return createErrorResult(`Unknown function selector: ${selector}`, {
                selector
            });
        }
        
        // Decode the function parameters
        const decodedParams = contractInterface.decodeFunctionData(fragment, calldata);
        
        // Format the result
        return createSuccessResult(fragment, selector, decodedParams);
        
    } catch (error) {
        return createErrorResult(`Decoding failed: ${error.message}`, {
            originalError: error.message
        });
    }
}

/**
 * Create the success result
 * @param {Object} fragment - the function fragment
 * @param {string} selector - the function selector
 * @param {Array} decodedParams - the decoded parameters
 * @returns {Object} the formatted success result
 */
function createSuccessResult(fragment, selector, decodedParams) {
    const namedParameters = createNamedParameters(fragment.inputs, decodedParams, fragment);
    
    return {
        function: {
            name: fragment.name,
            selector: selector
        },
        ...namedParameters  // Spread the parameters at the top level
    };
}

/**
 * Create named parameters object from function inputs and decoded values
 * @param {Array} inputs - the function input definitions from ABI
 * @param {Array} decodedParams - the decoded parameter values
 * @param {Object} fragment - the function fragment for context
 * @returns {Object} object with parameter names as keys and values
 */
function createNamedParameters(inputs, decodedParams, fragment) {
    const namedParams = {};
    
    inputs.forEach((input, index) => {
        // Use the parameter name from ABI, or create a default name
        const paramName = input.name || `param${index}`;
        let value = getValue(decodedParams[index]);
        
        // Special handling for BaseRequest tuple
        if (isBaseRequestTuple(input, value)) {
            value = formatBaseRequest(value);
        }
        // Special handling for RouterPath arrays (batches or DAG paths)
        else if (isRouterPathArray(input, value)) {
            value = formatRouterPathArray(value, fragment.name);
        }
        // Special handling for packed receiver parameter in uniswapV3SwapTo
        else if (isPackedReceiver(input, paramName)) {
            value = unpackReceiver(value);
        }
        // Special handling for pools array (different types for different functions)
        else if (isPoolsArray(input, paramName)) {
            value = unpackPoolsArray(value, fragment.name);
        }
        // Special handling for packed srcToken parameter in unxswapByOrderId
        else if (isPackedSrcToken(input, paramName)) {
            value = unpackSrcToken(value);
        }
        // Special handling for swapWrap rawdata parameter
        else if (isSwapWrapRawdata(input, paramName)) {
            value = unpackSwapRawdata(value);
        }
        
        namedParams[paramName] = value;
    });
    
    return namedParams;
}

/**
 * Create the error result
 * @param {string} message - the error message
 * @param {Object} extra - the extra information
 * @returns {Object} the error result
 */
function createErrorResult(message, extra = {}) {
    return {
        error: message,
        ...extra
    };
}

// Export main functionality
export { decodeFunctions };
