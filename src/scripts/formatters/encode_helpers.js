import { ethers } from 'ethers';
import { packDagRawDataArray, packRawDataArray } from './encode_packers.js';

// Mode constants for fromToken encoding
export const _MODE_NO_TRANSFER = ethers.BigNumber.from('1').shl(251);
export const _MODE_BY_INVEST = ethers.BigNumber.from('1').shl(250);
export const _MODE_PERMIT2 = ethers.BigNumber.from('1').shl(249);
export const _MODE_DEFAULT = ethers.BigNumber.from('0');

/**
 * Get mode constant by string name
 * @param {string} flagName - Flag name like 'NO_TRANSFER', 'BY_INVEST', 'PERMIT2'
 * @returns {ethers.BigNumber} Mode constant
 */
export function getModeByName(flagName) {
    switch (flagName) {
        case 'NO_TRANSFER':
            return _MODE_NO_TRANSFER;
        case 'BY_INVEST':
            return _MODE_BY_INVEST;
        case 'PERMIT2':
            return _MODE_PERMIT2;
        case 'DEFAULT':
        default:
            return _MODE_DEFAULT;
    }
}

/**
 * Process fromToken with mode flags
 * @param {Object|string} fromToken - fromToken object with address/flag or direct address
 * @returns {string} Processed fromToken value as string
 */
export function processFromTokenWithMode(fromToken) {
    if (typeof fromToken === 'object' && fromToken !== null) {
        // fromToken is a struct with address and flag fields
        const address = fromToken.address || fromToken;
        let flag = fromToken.flag || _MODE_DEFAULT;
        
        // Handle string flag names
        if (typeof flag === 'string') {
            flag = getModeByName(flag);
        }
        
        // Combine address with flag: uint256(uint160(address)) | flag
        const addressBN = ethers.BigNumber.from(address.toString());
        const flagBN = ethers.BigNumber.from(flag.toString());
        return addressBN.or(flagBN).toString();
    } else {
        // Fallback: treat as address and apply default mode
        const addressBN = ethers.BigNumber.from(fromToken.toString());
        return addressBN.toString();
    }
}

/**
 * Prepare baseRequest tuple from JSON object
 * @param {Object} baseRequest - BaseRequest object
 * @param {string} functionName - Optional function name to determine encoding type
 * @param {string|number} orderId - Optional orderId to encode with fromToken for specific functions
 * @returns {Array} BaseRequest tuple
 */
export function prepareBaseRequestTuple(baseRequest, functionName, orderId) {
    if (!baseRequest) {
        throw new Error('Missing baseRequest parameter');
    }
    
    let fromToken = baseRequest.fromToken;
    
    // For unxswapToWithBaseRequest, encode orderId with fromToken address
    if (functionName === 'unxswapToWithBaseRequest' && orderId) {
        // Encode as: (orderId << 160) | address(fromToken)
        // fromToken should be the address, orderId gets shifted and combined
        const orderIdBN = ethers.BigNumber.from(orderId.toString());
        const fromTokenBN = ethers.BigNumber.from(fromToken.toString());
        fromToken = orderIdBN.shl(160).or(fromTokenBN).toString();
    }
    
    return [
        fromToken,
        baseRequest.toToken,
        baseRequest.fromTokenAmount,
        baseRequest.minReturnAmount,
        baseRequest.deadLine
    ];
}

/**
 * Prepare RouterPath tuples from JSON array (for batches - 2D array)
 * @param {Array} batches - 2D array of RouterPath objects
 * @returns {Array} 2D array of RouterPath tuples
 */
export function prepareBatchesTuples(batches) {
    if (!Array.isArray(batches)) {
        throw new Error('Batches must be an array');
    }
    
    return batches.map(batch => 
        batch.map(routerPath => [
            routerPath.mixAdapters,
            routerPath.assetTo,
            packRawDataArray(routerPath.rawData), // Pack rawData objects
            routerPath.extraData,
            processFromTokenWithMode(routerPath.fromToken)
        ])
    );
}

/**
 * Prepare RouterPath tuples from JSON array (for paths - 1D array)
 * @param {Array} paths - 1D array of RouterPath objects
 * @returns {Array} 1D array of RouterPath tuples
 */
export function preparePathsTuples(paths) {
    if (!Array.isArray(paths)) {
        throw new Error('Paths must be an array');
    }
    
    return paths.map(routerPath => [
        routerPath.mixAdapters,
        routerPath.assetTo,
        packRawDataArray(routerPath.rawData), // Pack rawData objects
        routerPath.extraData,
        routerPath.fromToken
    ]);
}

/**
 * Prepare DAG RouterPath tuples from JSON array (for DAG paths - 1D array)
 * @param {Array} paths - 1D array of DAG RouterPath objects
 * @returns {Array} 1D array of DAG RouterPath tuples
 */
export function prepareDagPathsTuples(paths) {
    if (!Array.isArray(paths)) {
        throw new Error('DAG paths must be an array');
    }
    
    return paths.map(routerPath => [
        routerPath.mixAdapters,
        routerPath.assetTo,
        packDagRawDataArray(routerPath.rawData), // Pack DAG rawData objects with inputIndex/outputIndex
        routerPath.extraData,
        processFromTokenWithMode(routerPath.fromToken)
    ]);
}
