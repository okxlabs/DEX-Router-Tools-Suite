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
    SWAP_AMOUNT_MASK
} from '../core/masks.js';

/**
 * Pack srcToken object into uint256
 * @param {Object} srcToken - {orderId, address}
 * @returns {string} Packed uint256 value
 */
export function packSrcToken(srcToken) {
    if (typeof srcToken === 'string') {
        return srcToken; // Already packed
    }
    
    const { orderId, address } = srcToken;
    
    // Pack: orderId (32 bytes) + address (20 bytes, right-aligned)
    const orderIdBN = ethers.BigNumber.from(orderId);
    const addressBN = ethers.BigNumber.from(address);
    
    // Shift orderId left by 160 bits (20 bytes) and add address
    const packed = orderIdBN.shl(160).add(addressBN);
    
    return packed.toString();
}

/**
 * Pack receiver object into uint256
 * @param {Object} receiver - {isOneForZero, isWethUnwrap, address}
 * @returns {string} Packed uint256 value
 */
export function packReceiver(receiver) {
    if (typeof receiver === 'string') {
        return receiver; // Already packed
    }
    
    const { isOneForZero, isWethUnwrap, address } = receiver;
    
    let packed = ethers.BigNumber.from(address);
    
    if (isOneForZero) {
        packed = packed.or(ONE_FOR_ZERO_MASK);
    }
    
    if (isWethUnwrap) {
        packed = packed.or(WETH_UNWRAP_MASK);
    }
    
    return packed.toString();
}

/**
 * Pack rawdata object into uint256
 * @param {Object} rawdata - {reversed, amount}
 * @returns {string} Packed uint256 value
 */
export function packRawdata(rawdata) {
    if (typeof rawdata === 'string') {
        return rawdata; // Already packed
    }
    
    const { reversed, amount } = rawdata;
    
    // Start with the amount (should fit in SWAP_AMOUNT_MASK range)
    let packed = ethers.BigNumber.from(amount).and(SWAP_AMOUNT_MASK);
    
    // Set the reverse flag if needed (bit 255)
    if (reversed) {
        packed = packed.or(REVERSE_MASK);
    }
    
    return packed.toString();
}

/**
 * Pack pool object into uint256 (for uniswapV3 functions)
 * @param {Object} pool - {isOneForZero, pool}
 * @returns {string} Packed uint256 value
 */
export function packUniswapV3Pool(pool) {
    if (typeof pool === 'string') {
        return pool; // Already packed
    }
    
    const { isOneForZero, pool: poolAddress } = pool;
    
    let packed = ethers.BigNumber.from(poolAddress);
    
    if (isOneForZero) {
        packed = packed.or(ONE_FOR_ZERO_MASK);
    }
    
    return packed.toString();
}

/**
 * Pack pool object into bytes32 (for unxswap functions)
 * @param {Object} pool - {isToken0Tax, isToken1Tax, WETH, numerator, address}
 * @returns {string} Packed bytes32 value
 */
export function packUnxswapPool(pool) {
    if (typeof pool === 'string') {
        return pool; // Already packed
    }
    
    const { isToken0Tax, isToken1Tax, WETH, numerator, address } = pool;
    
    let packed = ethers.BigNumber.from(address);
    
    if (isToken0Tax) {
        packed = packed.or(IS_TOKEN0_TAX_MASK);
    }
    
    if (isToken1Tax) {
        packed = packed.or(IS_TOKEN1_TAX_MASK);
    }
    
    if (WETH) {
        packed = packed.or(WETH_MASK);
    }
    
    // Add numerator value
    const numeratorBN = ethers.BigNumber.from(numerator);
    const numeratorShifted = numeratorBN.and(ethers.BigNumber.from('0xFFFFFFFF')).shl(160);
    packed = packed.or(numeratorShifted);
    
    return packed.toHexString();
}

/**
 * Pack rawData objects into uint256 array
 * @param {Array} rawDataArray - Array of rawData objects
 * @returns {Array} Array of packed uint256 values
 */
export function packRawDataArray(rawDataArray) {
    if (!Array.isArray(rawDataArray)) {
        return rawDataArray;
    }
    
    return rawDataArray.map(rawData => {
        if (typeof rawData === 'string') {
            return rawData; // Already packed
        }
        
        const { poolAddress, reverse, weight } = rawData;
        
        let packed = ethers.BigNumber.from(poolAddress);
        
        if (reverse) {
            packed = packed.or(REVERSE_MASK);
        }
        
        // Add weight (assuming it goes in a specific position)
        const weightBN = ethers.BigNumber.from(weight);
        const weightShifted = weightBN.and(ethers.BigNumber.from('0xFFFF')).shl(160);
        packed = packed.or(weightShifted);
        
        return packed.toString();
    });
}
