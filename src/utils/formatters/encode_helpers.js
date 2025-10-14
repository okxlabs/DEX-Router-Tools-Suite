import { packRawDataArray, packDagRawDataArray } from './encode_packers.js';

/**
 * Prepare baseRequest tuple from JSON object
 * @param {Object} baseRequest - BaseRequest object
 * @returns {Array} BaseRequest tuple
 */
export function prepareBaseRequestTuple(baseRequest) {
    if (!baseRequest) {
        throw new Error('Missing baseRequest parameter');
    }
    
    return [
        baseRequest.fromToken,
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
            routerPath.fromToken
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
        routerPath.fromToken
    ]);
}
