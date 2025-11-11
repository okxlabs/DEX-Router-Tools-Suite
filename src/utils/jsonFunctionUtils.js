/**
 * Utility functions for handling JSON function examples and configurations
 */

// Import all JSON examples
import smartSwapByOrderId from './examples/smartSwapByOrderId.json';
import smartSwapTo from './examples/smartSwapTo.json';
import swapWrap from './examples/swapWrap.json';
import uniswapV3SwapTo from './examples/uniswapV3SwapTo.json';
import uniswapV3SwapToWithBaseRequest from './examples/uniswapV3SwapToWithBaseRequest.json';
import unxswapByOrderId from './examples/unxswapByOrderId.json';
import unxswapTo from './examples/unxswapTo.json';
import unxswapToWithBaseRequest from './examples/unxswapToWithBaseRequest.json';
import dagSwapByOrderId from './examples/dagSwapByOrderId.json';
import approve from './examples/approve.json';

/**
 * Get all available function examples organized by category
 * @returns {Array} Array of example objects with name, data, and category
 */
export const getFunctionExamples = () => {
    return [
        { 
            name: 'smartSwapByOrderId', 
            data: smartSwapByOrderId, 
            category: 'SMART SWAP'
        },
        { 
            name: 'smartSwapTo', 
            data: smartSwapTo, 
            category: 'SMART SWAP'
        },
        { 
            name: 'uniswapV3SwapTo', 
            data: uniswapV3SwapTo, 
            category: 'UNISWAPV3'
        },
        { 
            name: 'uniswapV3SwapToWithBaseRequest', 
            data: uniswapV3SwapToWithBaseRequest, 
            category: 'UNISWAPV3'
        },
        { 
            name: 'unxswapByOrderId', 
            data: unxswapByOrderId, 
            category: 'UNXSWAP'
        },
        { 
            name: 'unxswapTo', 
            data: unxswapTo, 
            category: 'UNXSWAP'
        },
        { 
            name: 'unxswapToWithBaseRequest', 
            data: unxswapToWithBaseRequest, 
            category: 'UNXSWAP'
        },
        { 
            name: 'dagSwapByOrderId', 
            data: dagSwapByOrderId, 
            category: 'DAG SWAP'
        },
        { 
            name: 'swapWrap', 
            data: swapWrap, 
            category: 'UTILITY'
        },
        { 
            name: 'approve', 
            data: approve, 
            category: 'ERC20'
        }
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

/**
 * Get function examples filtered by category
 * @param {string} category - The category to filter by
 * @returns {Array} Array of examples in the specified category
 */
export const getFunctionExamplesByCategory = (category) => {
    const examples = getFunctionExamples();
    return examples.filter(example => example.category === category);
};

/**
 * Get all available categories
 * @returns {Array} Array of unique category names
 */
export const getAvailableCategories = () => {
    const examples = getFunctionExamples();
    return [...new Set(examples.map(example => example.category))];
};
