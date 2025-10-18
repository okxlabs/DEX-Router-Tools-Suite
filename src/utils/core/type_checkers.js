/**
 * Validation functions for checking parameter types and structures
 * Used for identifying specific data structures that need special formatting
 */

/**
 * Check if the input represents a BaseRequest tuple
 * @param {Object} input - the function input definition from ABI
 * @param {any} value - the decoded value
 * @returns {boolean} true if this is a BaseRequest tuple
 */
function isBaseRequestTuple(input, value) {
    // Check if it's a tuple with the BaseRequest structure
    return input.type === 'tuple' && 
           input.components && 
           input.components.length === 5 &&
           input.components[0].type === 'uint256' &&
           input.components[1].type === 'address' &&
           input.components[2].type === 'uint256' &&
           input.components[3].type === 'uint256' &&
           input.components[4].type === 'uint256' &&
           Array.isArray(value) && 
           value.length === 5;
}

/**
 * Check if the input represents a RouterPath array (batches parameter)
 * @param {Object} input - the function input definition from ABI
 * @param {any} value - the decoded value
 * @returns {boolean} true if this is a RouterPath array
 */
function isRouterPathArray(input, value) {
    // Check if it's a 2D array of RouterPath tuples (for batches)
    // OR 1D array of RouterPath tuples (for DAG paths)
    return (input.type === 'tuple[][]' || input.type === 'tuple[]') && 
           input.components && 
           input.components.length === 5 &&
           input.components[0].type === 'address[]' &&
           input.components[1].type === 'address[]' &&
           input.components[2].type === 'uint256[]' &&
           input.components[3].type === 'bytes[]' &&
           input.components[4].type === 'uint256' &&
           Array.isArray(value);
}

/**
 * Check if a single item is a RouterPath tuple
 * @param {any} item - the item to check
 * @returns {boolean} true if this is a RouterPath tuple
 */
function isRouterPathTuple(item) {
    return Array.isArray(item) && 
           item.length === 5;
}

/**
 * Check if the parameter is a packed receiver parameter
 * @param {Object} input - the function input definition from ABI
 * @param {string} paramName - the parameter name
 * @returns {boolean} true if this is a packed receiver parameter
 */
function isPackedReceiver(input, paramName) {
    // Check if it's a uint256 parameter named 'receiver'
    return input.type === 'uint256' && paramName === 'receiver';
}

/**
 * Check if the parameter is a pools array
 * @param {Object} input - the function input definition from ABI
 * @param {string} paramName - the parameter name
 * @returns {boolean} true if this is a pools array parameter
 */
function isPoolsArray(input, paramName) {
    // Check if it's a uint256[] or bytes32[] parameter named 'pools'
    return (input.type === 'uint256[]' || input.type === 'bytes32[]') && paramName === 'pools';
}

/**
 * Check if the parameter is a packed srcToken parameter
 * @param {Object} input - the function input definition from ABI
 * @param {string} paramName - the parameter name
 * @returns {boolean} true if this is a packed srcToken parameter
 */
function isPackedSrcToken(input, paramName) {
    // Check if it's a uint256 parameter named 'srcToken'
    return input.type === 'uint256' && paramName === 'srcToken';
}

/**
 * Check if the parameter is a swapWrap rawdata parameter
 * @param {Object} input - the function input definition from ABI
 * @param {string} paramName - the parameter name
 * @returns {boolean} true if this is a swapWrap rawdata parameter
 */
function isSwapWrapRawdata(input, paramName) {
    // Check if it's a uint256 parameter named 'rawdata'
    return input.type === 'uint256' && paramName === 'rawdata';
}

export {
    isBaseRequestTuple,
    isRouterPathArray,
    isRouterPathTuple,
    isPackedReceiver,
    isPoolsArray,
    isPackedSrcToken,
    isSwapWrapRawdata
};
