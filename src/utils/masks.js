const { ethers } = require('ethers');

/**
 * DexRouter Contract Masks
 * All the bitmasks used throughout the DexRouter contract for packed data
 */

// Address mask (lower 160 bits)
const ADDRESS_MASK = ethers.BigNumber.from("0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff");

// One for Zero mask (bit 255)
const ONE_FOR_ZERO_MASK = ethers.BigNumber.from("0x8000000000000000000000000000000000000000000000000000000000000000");

// WETH unwrap mask (bit 253)
const WETH_UNWRAP_MASK = ethers.BigNumber.from("0x2000000000000000000000000000000000000000000000000000000000000000");

// Order ID mask (bits 160-255)
const ORDER_ID_MASK = ethers.BigNumber.from("0xffffffffffffffffffffffff0000000000000000000000000000000000000000");

// Weight mask for rawData (bits 160-175)
const WEIGHT_MASK = ethers.BigNumber.from("0x00000000000000000000ffff0000000000000000000000000000000000000000");

// Reverse mask for rawData (bit 255)
const REVERSE_MASK = ethers.BigNumber.from("0x8000000000000000000000000000000000000000000000000000000000000000");

// Token tax masks for pools
const IS_TOKEN0_TAX_MASK = ethers.BigNumber.from("0x1000000000000000000000000000000000000000000000000000000000000000");
const IS_TOKEN1_TAX_MASK = ethers.BigNumber.from("0x2000000000000000000000000000000000000000000000000000000000000000");

// WETH mask for pools (different from WETH_UNWRAP_MASK)
const WETH_MASK = ethers.BigNumber.from("0x4000000000000000000000000000000000000000000000000000000000000000");

// Numerator mask for pools (32-bit value at bits 160-191)
const NUMERATOR_MASK = ethers.BigNumber.from("0x0000000000000000ffffffff0000000000000000000000000000000000000000");

// Swap amount mask for swapWrap rawdata (all bits except the reverse bit)
const SWAP_AMOUNT_MASK = ethers.BigNumber.from("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

// DAG-specific masks for rawData in dagSwap functions
const DAG_INPUT_INDEX_MASK = ethers.BigNumber.from("0x0000000000000000ff0000000000000000000000000000000000000000000000");
const DAG_OUTPUT_INDEX_MASK = ethers.BigNumber.from("0x000000000000000000ff00000000000000000000000000000000000000000000");

module.exports = {
    ADDRESS_MASK,
    ONE_FOR_ZERO_MASK,
    WETH_UNWRAP_MASK,
    ORDER_ID_MASK,
    WEIGHT_MASK,
    REVERSE_MASK,
    IS_TOKEN0_TAX_MASK,
    IS_TOKEN1_TAX_MASK,
    WETH_MASK,
    NUMERATOR_MASK,
    SWAP_AMOUNT_MASK,
    DAG_INPUT_INDEX_MASK,
    DAG_OUTPUT_INDEX_MASK
};
