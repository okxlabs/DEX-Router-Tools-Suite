/**
 * Utility functions for handling JSON function examples and configurations
 */

// Import all JSON examples
import smartSwapByOrderId from '../examples/smartSwapByOrderId.json';
import smartSwapTo from '../examples/smartSwapTo.json';
import swapWrap from '../examples/swapWrap.json';
import uniswapV3SwapTo from '../examples/uniswapV3SwapTo.json';
import uniswapV3SwapToWithBaseRequest from '../examples/uniswapV3SwapToWithBaseRequest.json';
import unxswapByOrderId from '../examples/unxswapByOrderId.json';
import unxswapTo from '../examples/unxswapTo.json';
import unxswapToWithBaseRequest from '../examples/unxswapToWithBaseRequest.json';
import dagSwapByOrderId from '../examples/dagSwapByOrderId.json';
import dagSwapTo from '../examples/dagSwapTo.json';
import approve from '../examples/approve.json';

/**
 * Get all available function examples
 * @returns {Array} Array of example objects with name and data
 */
export const getFunctionExamples = () => {
    return [
        { name: 'smartSwapByOrderId', data: smartSwapByOrderId },
        { name: 'smartSwapTo', data: smartSwapTo },
        { name: 'uniswapV3SwapTo', data: uniswapV3SwapTo },
        { name: 'uniswapV3SwapToWithBaseRequest', data: uniswapV3SwapToWithBaseRequest },
        { name: 'unxswapByOrderId', data: unxswapByOrderId },
        { name: 'unxswapTo', data: unxswapTo },
        { name: 'unxswapToWithBaseRequest', data: unxswapToWithBaseRequest },
        { name: 'dagSwapByOrderId', data: dagSwapByOrderId },
        { name: 'dagSwapTo', data: dagSwapTo },
        { name: 'swapWrap', data: swapWrap },
        { name: 'approve', data: approve }
    ];
};

/**
 * Get a specific function example by name
 * @param {string} name - The name of the example to retrieve
 * @returns {Object|null} The example object or null if not found
 */
export const getFunctionExampleByName = (name) => {
    const examples = getFunctionExamples();
    return examples.find(example => example.name === name) || null;
};
