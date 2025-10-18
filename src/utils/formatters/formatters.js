import { ethers } from 'ethers';
import {
    ADDRESS_MASK,
    ONE_FOR_ZERO_MASK,
    WETH_UNWRAP_MASK,
    WEIGHT_MASK,
    REVERSE_MASK,
    IS_TOKEN0_TAX_MASK,
    IS_TOKEN1_TAX_MASK,
    WETH_MASK,
    NUMERATOR_MASK,
    SWAP_AMOUNT_MASK,
    DAG_INPUT_INDEX_MASK,
    DAG_OUTPUT_INDEX_MASK
} from '../core/masks.js';
import { isRouterPathTuple } from '../core/type_checkers.js';

/**
 * Convert ethers BigNumbers to strings and process nested data structures
 * @param {any} value - the value to convert
 * @returns {any} converted value
 */
function getValue(value) {
    // Handle BigNumber objects
    if (value && value._isBigNumber) {
        const hexStr = value.toHexString();
        
        // If it looks like an address (20 bytes), convert to address format
        if (hexStr.length === 42) { // 0x + 40 chars = 42 total
            return hexStr;
        }
        
        // For large numbers, return decimal string
        return value.toString();
    }
    
    // Handle arrays recursively
    if (Array.isArray(value)) {
        return value.map(item => getValue(item));
    }
    
    // Handle objects recursively
    if (value && typeof value === 'object' && value.constructor === Object) {
        const cleaned = {};
        for (const [key, val] of Object.entries(value)) {
            cleaned[key] = getValue(val);
        }
        return cleaned;
    }
    
    // Return primitive values as-is
    return value;
}

/**
 * Format BaseRequest tuple with named fields
 * @param {Array} baseRequestArray - the BaseRequest tuple as array
 * @returns {Object} formatted BaseRequest with field names
 */
function formatBaseRequest(baseRequestArray) {
    const [fromToken, toToken, fromTokenAmount, minReturnAmount, deadLine] = baseRequestArray;
    
    return {
        fromToken: getValue(fromToken),
        toToken: getValue(toToken),
        fromTokenAmount: getValue(fromTokenAmount),
        minReturnAmount: getValue(minReturnAmount),
        deadLine: getValue(deadLine)
    };
}

/**
 * Format RouterPath array with named fields
 * @param {Array} routerPathArray - the 2D array of RouterPath tuples (or 1D for DAG)
 * @param {string} functionName - optional function name to determine decode type
 * @returns {Array} formatted RouterPath array with field names
 */
function formatRouterPathArray(routerPathArray, functionName) {
    // Check if this is a DAG function with 1D paths array
    const isDagFunction = functionName && functionName.startsWith('dagSwap');
    
    if (isDagFunction) {
        // DAG paths is a 1D array of RouterPath tuples
        return routerPathArray.map(routerPath => {
            if (isRouterPathTuple(routerPath)) {
                return formatRouterPath(routerPath, functionName);
            }
            return getValue(routerPath);
        });
    } else {
        // Regular 2D array for batch operations
        return routerPathArray.map(batch => {
            return batch.map(routerPath => {
                if (isRouterPathTuple(routerPath)) {
                    return formatRouterPath(routerPath, functionName);
                }
                return getValue(routerPath);
            });
        });
    }
}

/**
 * Format a single RouterPath tuple with named fields
 * @param {Array} routerPathArray - the RouterPath tuple as array
 * @param {string} functionName - optional function name to determine decode type
 * @returns {Object} formatted RouterPath with field names
 */
function formatRouterPath(routerPathArray, functionName) {
    const [mixAdapters, assetTo, rawData, extraData, fromToken] = routerPathArray;
    
    return {
        mixAdapters: getValue(mixAdapters),
        assetTo: getValue(assetTo),
        rawData: decodeRawDataArray(rawData, functionName),
        extraData: getValue(extraData),
        fromToken: getValue(fromToken)
    };
}

/**
 * Decode rawData array by unpacking each uint256 value
 * @param {Array} rawDataArray - array of rawData uint256 values
 * @param {string} functionName - optional function name to determine decode type
 * @returns {Array} array of decoded rawData objects
 */
function decodeRawDataArray(rawDataArray, functionName) {
    if (!Array.isArray(rawDataArray)) {
        return getValue(rawDataArray);
    }
    
    // Check if this is from a DAG function
    const isDagFunction = functionName && functionName.startsWith('dagSwap');
    
    return rawDataArray.map(rawDataItem => {
        if (isDagFunction) {
            return unpackDagRawData(rawDataItem);
        } else {
            return unpackRawData(rawDataItem);
        }
    });
}

/**
 * Unpack a single rawData uint256 value into its components
 * @param {any} rawDataValue - the rawData uint256 value (BigNumber or string)
 * @returns {Object} unpacked rawData with poolAddress, reverse, and weight
 */
function unpackRawData(rawDataValue) {
    try {
        // Convert to BigNumber if it's not already
        let rawDataBN;
        if (rawDataValue && rawDataValue._isBigNumber) {
            rawDataBN = rawDataValue;
        } else {
            rawDataBN = ethers.BigNumber.from(rawDataValue.toString());
        }

        // Extract components using bitwise operations
        const poolAddress = rawDataBN.and(ADDRESS_MASK);
        const reverseFlag = rawDataBN.and(REVERSE_MASK);
        const weightMasked = rawDataBN.and(WEIGHT_MASK);
        const weight = weightMasked.shr(160); // Shift right by 160 bits

        return {
            poolAddress: "0x" + poolAddress.toHexString().slice(2).padStart(40, '0'),
            reverse: !reverseFlag.isZero(),
            weight: weight.toString()
        };
    } catch (error) {
        // If unpacking fails, return the original value
        return {
            original: getValue(rawDataValue),
            error: `Failed to unpack rawData: ${error.message}`
        };
    }
}

/**
 * Unpack a receiver uint256 value into its components
 * @param {any} receiverValue - the receiver uint256 value (BigNumber or string)
 * @returns {Object} unpacked receiver with isOneForZero, isWethUnwrap, and address
 */
function unpackReceiver(receiverValue) {
    try {
        // Convert to BigNumber if it's not already
        let receiverBN;
        if (receiverValue && receiverValue._isBigNumber) {
            receiverBN = receiverValue;
        } else {
            receiverBN = ethers.BigNumber.from(receiverValue.toString());
        }

        // Extract components using bitwise operations
        const isOneForZero = !receiverBN.and(ONE_FOR_ZERO_MASK).isZero();
        const isWethUnwrap = !receiverBN.and(WETH_UNWRAP_MASK).isZero();
        const address = receiverBN.and(ADDRESS_MASK);

        return {
            isOneForZero: isOneForZero,
            isWethUnwrap: isWethUnwrap,
            address: "0x" + address.toHexString().slice(2).padStart(40, '0')
        };
    } catch (error) {
        // If unpacking fails, return the original value
        return {
            original: getValue(receiverValue),
            error: `Failed to unpack receiver: ${error.message}`
        };
    }
}

/**
 * Unpack a pools array based on function type
 * @param {Array} poolsArray - the pools array (uint256[] or bytes32[])
 * @param {string} functionName - the name of the function being called
 * @returns {Array} unpacked pools array
 */
function unpackPoolsArray(poolsArray, functionName) {
    if (!Array.isArray(poolsArray) || poolsArray.length === 0) {
        return getValue(poolsArray);
    }

    // Determine which type of pool unpacking to use based on function name
    const isUnxswapFunction = functionName && functionName.startsWith('unxswap');

    return poolsArray.map((poolValue, index) => {
        // Convert bytes32 hex strings to BigNumber if needed
        let processedPoolValue = poolValue;
        if (typeof poolValue === 'string' && poolValue.startsWith('0x')) {
            processedPoolValue = ethers.BigNumber.from(poolValue);
        }

        if (isUnxswapFunction) {
            // unxswap functions: complex pool structure with all masks
            return unpackUnxswapPool(processedPoolValue);
        } else {
            // uniswapV3 functions: simple pool structure with isOneForZero only
            return unpackUniswapV3Pool(processedPoolValue);
        }
    });
}

/**
 * Unpack a single unxswap pool with all masks (isToken0Tax + isToken1Tax + WETH + numeratorMask value + address)
 * @param {any} poolValue - the pool uint256 value
 * @returns {Object} unpacked pool with boolean flags, numerator value, and address
 */
function unpackUnxswapPool(poolValue) {
    try {
        // Convert to BigNumber if it's not already
        let poolBN;
        if (poolValue && poolValue._isBigNumber) {
            poolBN = poolValue;
        } else {
            poolBN = ethers.BigNumber.from(poolValue.toString());
        }

        // Extract all components
        const isToken0Tax = !poolBN.and(IS_TOKEN0_TAX_MASK).isZero();
        const isToken1Tax = !poolBN.and(IS_TOKEN1_TAX_MASK).isZero();
        const isWETH = !poolBN.and(WETH_MASK).isZero();
        const numeratorValue = poolBN.and(NUMERATOR_MASK).shr(160);
        const address = poolBN.and(ADDRESS_MASK);

        return {
            isToken0Tax: isToken0Tax,
            isToken1Tax: isToken1Tax,
            WETH: isWETH,
            numerator: numeratorValue.toString(),
            address: "0x" + address.toHexString().slice(2).padStart(40, '0')
        };
    } catch (error) {
        return {
            original: getValue(poolValue),
            error: `Failed to unpack unxswap pool: ${error.message}`
        };
    }
}

/**
 * Unpack a single uniswapV3 pool with simple structure (isOneForZero + address)
 * @param {any} poolValue - the pool uint256 value
 * @returns {Object} unpacked pool with isOneForZero and address
 */
function unpackUniswapV3Pool(poolValue) {
    try {
        // Convert to BigNumber if it's not already
        let poolBN;
        if (poolValue && poolValue._isBigNumber) {
            poolBN = poolValue;
        } else {
            poolBN = ethers.BigNumber.from(poolValue.toString());
        }

        // Extract components
        const isOneForZero = !poolBN.and(ONE_FOR_ZERO_MASK).isZero();
        const address = poolBN.and(ADDRESS_MASK);

        return {
            isOneForZero: isOneForZero,
            pool: "0x" + address.toHexString().slice(2).padStart(40, '0')
        };
    } catch (error) {
        return {
            original: getValue(poolValue),
            error: `Failed to unpack uniswapV3 pool: ${error.message}`
        };
    }
}

/**
 * Unpack a srcToken uint256 value into its components
 * @param {any} srcTokenValue - the srcToken uint256 value (BigNumber or string)
 * @returns {Object} unpacked srcToken with orderId and address
 */
function unpackSrcToken(srcTokenValue) {
    try {
        // Convert to BigNumber if it's not already
        let srcTokenBN;
        if (srcTokenValue && srcTokenValue._isBigNumber) {
            srcTokenBN = srcTokenValue;
        } else {
            srcTokenBN = ethers.BigNumber.from(srcTokenValue.toString());
        }

        // Extract components
        const address = srcTokenBN.and(ADDRESS_MASK);
        const orderId = srcTokenBN.shr(160); // Shift right by 160 bits to get the orderId

        return {
            orderId: orderId.toString(),
            address: "0x" + address.toHexString().slice(2).padStart(40, '0')
        };
    } catch (error) {
        // If unpacking fails, return the original value
        return {
            original: getValue(srcTokenValue),
            error: `Failed to unpack srcToken: ${error.message}`
        };
    }
}

/**
 * Unpack a swapWrap rawdata uint256 value into its components
 * @param {any} rawdataValue - the rawdata uint256 value (BigNumber or string)
 * @returns {Object} unpacked rawdata with reverse flag and amount
 */
function unpackSwapRawdata(rawdataValue) {
    try {
        // Convert to BigNumber if it's not already
        let rawdataBN;
        if (rawdataValue && rawdataValue._isBigNumber) {
            rawdataBN = rawdataValue;
        } else {
            rawdataBN = ethers.BigNumber.from(rawdataValue.toString());
        }

        // Extract components using bitwise operations
        const reversed = !rawdataBN.and(REVERSE_MASK).isZero();
        const amount = rawdataBN.and(SWAP_AMOUNT_MASK);

        return {
            reversed: reversed,
            amount: amount.toString()
        };
    } catch (error) {
        // If unpacking fails, return the original value
        return {
            original: getValue(rawdataValue),
            error: `Failed to unpack swapWrap rawdata: ${error.message}`
        };
    }
}

/**
 * Unpack a DAG rawData uint256 value into its components
 * @param {any} rawDataValue - the rawData uint256 value (BigNumber or string)
 * @returns {Object} unpacked rawData with poolAddress, reverse, weight, inputIndex, and outputIndex
 */
function unpackDagRawData(rawDataValue) {
    try {
        // Convert to BigNumber if it's not already
        let rawDataBN;
        if (rawDataValue && rawDataValue._isBigNumber) {
            rawDataBN = rawDataValue;
        } else {
            rawDataBN = ethers.BigNumber.from(rawDataValue.toString());
        }

        // Extract components using bitwise operations according to DAG specification:
        // poolAddress := and(rawData, _ADDRESS_MASK)
        // reverse := and(rawData, _REVERSE_MASK)
        // weight := shr(160, and(rawData, _WEIGHT_MASK))
        // inputIndex := shr(184, and(rawData, _INPUT_INDEX_MASK))
        // outputIndex := shr(176, and(rawData, _OUTPUT_INDEX_MASK))
        
        const poolAddress = rawDataBN.and(ADDRESS_MASK);
        const reverseFlag = rawDataBN.and(REVERSE_MASK);
        const weight = rawDataBN.and(WEIGHT_MASK).shr(160); // Shift right by 160 bits
        const inputIndex = rawDataBN.and(DAG_INPUT_INDEX_MASK).shr(184); // Shift right by 184 bits
        const outputIndex = rawDataBN.and(DAG_OUTPUT_INDEX_MASK).shr(176); // Shift right by 176 bits

        return {
            poolAddress: "0x" + poolAddress.toHexString().slice(2).padStart(40, '0'),
            reverse: !reverseFlag.isZero(),
            weight: weight.toString(),
            inputIndex: inputIndex.toString(),
            outputIndex: outputIndex.toString()
        };
    } catch (error) {
        // If unpacking fails, return the original value
        return {
            original: getValue(rawDataValue),
            error: `Failed to unpack DAG rawData: ${error.message}`
        };
    }
}

export {
    getValue,
    formatBaseRequest,
    formatRouterPathArray,
    formatRouterPath,
    decodeRawDataArray,
    unpackRawData,
    unpackReceiver,
    unpackPoolsArray,
    unpackUnxswapPool,
    unpackUniswapV3Pool,
    unpackSrcToken,
    unpackSwapRawdata,
    unpackDagRawData
};
