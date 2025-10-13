import { ethers } from 'ethers';
import { DEXROUTER_ABI } from '../core/abi.js';
import {
    ADDRESS_MASK,
    WEIGHT_MASK,
    REVERSE_MASK,
    DAG_INPUT_INDEX_MASK,
    DAG_OUTPUT_INDEX_MASK
} from '../core/masks.js';

// Initialize interface once
const contractInterface = new ethers.utils.Interface(DEXROUTER_ABI);

/**
 * Encode function parameters to calldata (without commission data)
 * @param {Object} jsonData - The JSON object from decode_calldata
 * @returns {string} The encoded calldata string
 */
export function encodeFunctions(jsonData) {
    try {
        // Validate input
        if (!jsonData || typeof jsonData !== 'object') {
            throw new Error('Invalid JSON input');
        }

        // Check if we have function information
        if (!jsonData.function || !jsonData.function.name) {
            throw new Error('Missing function information in JSON data');
        }

        const functionName = jsonData.function.name;
        
        // Get the function fragment from ABI
        let fragment = contractInterface.functions[functionName];
        
        // If not found, try to find by iterating through all functions
        if (!fragment) {
            const functionFragments = Object.values(contractInterface.functions);
            fragment = functionFragments.find(f => f.name === functionName);
        }
        
        if (!fragment) {
            // Debug: list available functions
            const availableFunctions = Object.keys(contractInterface.functions);
            throw new Error(`Unknown function: ${functionName}. Available functions: ${availableFunctions.join(', ')}`);
        }

        // Extract parameters from JSON data
        const parameters = extractParameters(jsonData, fragment);
        
        // Encode the function call
        const encodedCalldata = contractInterface.encodeFunctionData(fragment, parameters);
        
        return encodedCalldata;

    } catch (error) {
        console.error('Encode functions error:', error);
        throw new Error(error.message);
    }
}

/**
 * Extract parameters from JSON data based on function fragment
 * @param {Object} jsonData - The decoded JSON data
 * @param {Object} fragment - The function fragment from ABI
 * @returns {Array} Array of parameter values in correct order
 */
function extractParameters(jsonData, fragment) {
    const parameters = [];
    
    // Go through each input parameter in the ABI
    fragment.inputs.forEach((input, index) => {
        const paramName = input.name || `param${index}`;
        let value = jsonData[paramName];
        
        if (value === undefined) {
            throw new Error(`Missing parameter: ${paramName}`);
        }
        
        // Convert special formatted values back to their original form
        value = convertParameterValue(value, input, paramName);
        
        parameters.push(value);
    });
    
    return parameters;
}

/**
 * Convert formatted parameter values back to their original form
 * @param {*} value - The formatted value from decode
 * @param {Object} input - The input definition from ABI
 * @param {string} paramName - The parameter name
 * @returns {*} The converted value
 */
function convertParameterValue(value, input, paramName) {
    // Handle BaseRequest tuple
    if (input.type === 'tuple' && input.components && isBaseRequestTuple(input)) {
        return convertBaseRequest(value);
    }
    
    // Handle RouterPath arrays (batches or paths)
    if (input.type.includes('[]') && (paramName === 'batches' || paramName === 'paths')) {
        return convertRouterPathArray(value);
    }
    
    // Handle packed receiver (uniswapV3SwapTo)
    if (paramName === 'receiver' && typeof value === 'object' && value.address) {
        return packReceiver(value);
    }
    
    // Handle pools array
    if (paramName === 'pools' && Array.isArray(value)) {
        return convertPoolsArray(value);
    }
    
    // Handle packed srcToken (unxswapByOrderId)
    if (paramName === 'srcToken' && typeof value === 'object' && value.token !== undefined) {
        return packSrcToken(value);
    }
    
    // Handle swapWrap rawdata
    if (paramName === 'rawdata' && typeof value === 'object') {
        return packSwapRawdata(value);
    }
    
    // Handle BigNumber strings
    if (typeof value === 'string' && value.match(/^\d+$/)) {
        return ethers.BigNumber.from(value);
    }
    
    // Handle arrays recursively
    if (Array.isArray(value)) {
        return value.map(item => {
            if (typeof item === 'object' && item !== null) {
                return convertComplexType(item, input);
            }
            return item;
        });
    }
    
    return value;
}

/**
 * Check if input is a BaseRequest tuple
 */
function isBaseRequestTuple(input) {
    return input.components && 
           input.components.length === 5 &&
           input.components.some(comp => comp.name === 'fromToken') &&
           input.components.some(comp => comp.name === 'toToken');
}

/**
 * Convert BaseRequest object back to tuple array
 */
function convertBaseRequest(baseRequest) {
    if (!baseRequest || typeof baseRequest !== 'object') {
        throw new Error('Invalid BaseRequest format');
    }
    
    return [
        ethers.BigNumber.from(baseRequest.fromToken || '0'),
        baseRequest.toToken || ethers.constants.AddressZero,
        ethers.BigNumber.from(baseRequest.fromTokenAmount || '0'),
        ethers.BigNumber.from(baseRequest.minReturnAmount || '0'),
        ethers.BigNumber.from(baseRequest.deadLine || '0')
    ];
}

/**
 * Convert RouterPath array back to original format
 */
function convertRouterPathArray(routerPaths) {
    if (!Array.isArray(routerPaths)) {
        return routerPaths;
    }
    
    return routerPaths.map(path => {
        if (Array.isArray(path)) {
            // Handle batches (array of arrays)
            return path.map(batch => convertSingleRouterPath(batch));
        } else {
            // Handle single path
            return convertSingleRouterPath(path);
        }
    });
}

/**
 * Convert single router path object back to tuple
 */
function convertSingleRouterPath(path) {
    if (!path || typeof path !== 'object') {
        return path;
    }
    
    return [
        path.mixAdapters || [],
        path.assetTo || [],
        (path.rawData || []).map(data => packRawData(data)),
        path.extraData || [],
        ethers.BigNumber.from(path.fromToken || '0')
    ];
}

/**
 * Pack receiver object back to uint256
 */
function packReceiver(receiverObj) {
    if (typeof receiverObj === 'string' || ethers.BigNumber.isBigNumber(receiverObj)) {
        return receiverObj;
    }
    
    // This is a simplified version - you may need to implement the actual packing logic
    // based on how the original unpacking was done
    return ethers.BigNumber.from(receiverObj.address || '0');
}

/**
 * Convert pools array back to original format
 */
function convertPoolsArray(pools) {
    return pools.map(pool => {
        if (typeof pool === 'string') {
            return pool;
        }
        if (typeof pool === 'object' && pool.value) {
            return pool.value;
        }
        return pool;
    });
}

/**
 * Pack srcToken object back to uint256
 */
function packSrcToken(srcTokenObj) {
    if (typeof srcTokenObj === 'string' || ethers.BigNumber.isBigNumber(srcTokenObj)) {
        return srcTokenObj;
    }
    
    // Simplified packing - implement based on original unpacking logic
    return ethers.BigNumber.from(srcTokenObj.token || '0');
}

/**
 * Pack swapWrap rawdata back to uint256
 */
function packSwapRawdata(rawdataObj) {
    if (typeof rawdataObj === 'string' || ethers.BigNumber.isBigNumber(rawdataObj)) {
        return rawdataObj;
    }
    
    // Simplified packing - implement based on original unpacking logic
    return ethers.BigNumber.from(rawdataObj.value || '0');
}

/**
 * Convert complex types recursively
 */
function convertComplexType(obj, input) {
    if (input.type === 'tuple' && input.components) {
        // Convert object to tuple array
        const tupleArray = [];
        input.components.forEach((comp, index) => {
            const value = obj[comp.name] || obj[index];
            tupleArray.push(convertParameterValue(value, comp, comp.name));
        });
        return tupleArray;
    }
    
    return obj;
}

/**
 * Pack rawData object back to uint256
 * @param {Object|string|BigNumber} rawDataObj - The rawData object with poolAddress, reverse, weight
 * @returns {BigNumber} Packed rawData as uint256
 */
function packRawData(rawDataObj) {
    // If it's already a number/BigNumber, return as is
    if (typeof rawDataObj === 'string' || ethers.BigNumber.isBigNumber(rawDataObj)) {
        return ethers.BigNumber.from(rawDataObj);
    }
    
    if (!rawDataObj || typeof rawDataObj !== 'object') {
        return ethers.BigNumber.from('0');
    }
    
    try {
        // Extract components
        const poolAddress = rawDataObj.poolAddress || '0x0000000000000000000000000000000000000000';
        const reverse = rawDataObj.reverse || false;
        const weight = rawDataObj.weight || '0';
        const inputIndex = rawDataObj.inputIndex || '0';  // For DAG functions
        const outputIndex = rawDataObj.outputIndex || '0'; // For DAG functions
        
        // Start with the pool address (lower 160 bits)
        let packed = ethers.BigNumber.from(poolAddress);
        
        // Add weight (bits 160-175)
        const weightBN = ethers.BigNumber.from(weight);
        packed = packed.or(weightBN.shl(160));
        
        // Add reverse flag (bit 255)
        if (reverse) {
            packed = packed.or(REVERSE_MASK);
        }
        
        // Add DAG-specific fields if present
        if (inputIndex !== '0') {
            const inputIndexBN = ethers.BigNumber.from(inputIndex);
            packed = packed.or(inputIndexBN.shl(184));
        }
        
        if (outputIndex !== '0') {
            const outputIndexBN = ethers.BigNumber.from(outputIndex);
            packed = packed.or(outputIndexBN.shl(176));
        }
        
        return packed;
        
    } catch (error) {
        console.error('Error packing rawData:', error);
        return ethers.BigNumber.from('0');
    }
}
