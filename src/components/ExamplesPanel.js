import React, { useState } from 'react';
import './ExamplesPanel.css';

// Import all JSON examples
import smartSwapByOrderId from '../utils/examples/smartSwapByOrderId.json';
import smartSwapTo from '../utils/examples/smartSwapTo.json';
import swapWrap from '../utils/examples/swapWrap.json';
import uniswapV3SwapTo from '../utils/examples/uniswapV3SwapTo.json';
import uniswapV3SwapToWithBaseRequest from '../utils/examples/uniswapV3SwapToWithBaseRequest.json';
import unxswapByOrderId from '../utils/examples/unxswapByOrderId.json';
import unxswapTo from '../utils/examples/unxswapTo.json';
import unxswapToWithBaseRequest from '../utils/examples/unxswapToWithBaseRequest.json';
import approve from '../utils/examples/approve.json';

const ExamplesPanel = ({ onExampleSelect, showToast }) => {
    const [expandedItems, setExpandedItems] = useState({});
    const [selectedCommission, setSelectedCommission] = useState(0);
    const [selectedTrim, setSelectedTrim] = useState(0);

    // Organize examples by category
    const examples = [
        { 
            name: 'smartSwapByOrderId', 
            data: smartSwapByOrderId, 
            description: 'Smart swap with order ID and batches',
            category: 'Smart Swap'
        },
        { 
            name: 'smartSwapTo', 
            data: smartSwapTo, 
            description: 'Smart swap to specific receiver',
            category: 'Smart Swap'
        },
        { 
            name: 'uniswapV3SwapTo', 
            data: uniswapV3SwapTo, 
            description: 'UniswapV3 swap with commission',
            category: 'UniswapV3'
        },
        { 
            name: 'uniswapV3SwapToWithBaseRequest', 
            data: uniswapV3SwapToWithBaseRequest, 
            description: 'UniswapV3 swap with base request',
            category: 'UniswapV3'
        },
        { 
            name: 'unxswapByOrderId', 
            data: unxswapByOrderId, 
            description: 'Unxswap with order ID',
            category: 'Unxswap'
        },
        { 
            name: 'unxswapTo', 
            data: unxswapTo, 
            description: 'Unxswap to receiver',
            category: 'Unxswap'
        },
        { 
            name: 'unxswapToWithBaseRequest', 
            data: unxswapToWithBaseRequest, 
            description: 'Unxswap with base request',
            category: 'Unxswap'
        },
        { 
            name: 'swapWrap', 
            data: swapWrap, 
            description: 'Simple swap wrap function',
            category: 'Utility'
        },
        { 
            name: 'approve', 
            data: approve, 
            description: 'ERC20 approve function - allows spender to transfer tokens',
            category: 'ERC20'
        }
    ];

    const toggleExample = (exampleName) => {
        setExpandedItems(prev => ({
            ...prev,
            [exampleName]: !prev[exampleName]
        }));
    };

    const handleExampleClick = (example) => {
        // Generate complete JSON with function + commission + trim based on current state
        generateCompleteJson(example);
    };

    const generateCompleteJson = async (example) => {
        try {
            // Start with the base function data
            let completeJson = { ...example.data };

            // Check if this is a function that should NOT have commission/trim
            const functionsWithoutCommissionTrim = ['approve', 'swapWrap'];
            const functionName = example.data.function?.name;
            
            if (functionsWithoutCommissionTrim.includes(functionName)) {
                // For ERC20 and utility functions, just return the base function data
                onExampleSelect(JSON.stringify(completeJson, null, 2));
                showToast(`${example.name} loaded!`, 'success');
                return;
            }

            // For DEX router functions, add commission and trim data
            const feeData = await import('../utils/examples/fee.json');
            
            // Add commission data based on current state
            if (selectedCommission === 0) {
                completeJson.hasCommission = false;
            } else {
                const commissionConfig = feeData.default.find(item => 
                    item.name === (selectedCommission === 1 ? 'Single Commission' : 'Dual Commission')
                );
                if (commissionConfig) {
                    const { name, ...commissionData } = commissionConfig;
                    completeJson = { ...completeJson, ...commissionData };
                }
            }

            // Add trim data based on current state
            if (selectedTrim === 0) {
                completeJson.hasTrim = false;
            } else {
                const trimConfig = feeData.default.find(item => 
                    item.name === (selectedTrim === 1 ? 'Single Trim' : 'Dual Trim')
                );
                if (trimConfig) {
                    const { name, ...trimData } = trimConfig;
                    completeJson = { ...completeJson, ...trimData };
                }
            }

            // Load the complete JSON into the encoder
            onExampleSelect(JSON.stringify(completeJson, null, 2));
            showToast(`${example.name} loaded!`, 'success');

        } catch (error) {
            console.error('Failed to generate complete JSON:', error);
            showToast('Failed to load configuration', 'error');
        }
    };

    const handleCommissionTrimSelect = (type, count) => {
        // Update state silently - no toast notifications
        if (type === 'commission') {
            setSelectedCommission(count);
        } else if (type === 'trim') {
            setSelectedTrim(count);
        }
        // State is updated, next function click will use the new state
    };

    const formatJsonPreview = (data) => {
        // Show a condensed preview of the JSON
        const { function: func, ...rest } = data;
        const preview = {
            function: func.name,
            ...Object.fromEntries(
                Object.entries(rest).slice(0, 3).map(([key, value]) => [
                    key, 
                    typeof value === 'object' && value !== null ? '...' : value
                ])
            )
        };
        if (Object.keys(rest).length > 3) {
            preview['...'] = `+${Object.keys(rest).length - 3} more`;
        }
        return JSON.stringify(preview, null, 2);
    };

    return (
        <div className="examples-panel">
            <div className="examples-header">
                <h3>📋 JSON Examples</h3>
                <p>Click any example to load it into the encoder</p>
            </div>

            <div className="examples-list">
                {examples.map((example) => (
                    <div key={example.name} className="example-item">
                        <div className="example-header">
                            <span 
                                className={`example-arrow ${expandedItems[example.name] ? 'expanded' : ''}`}
                                onClick={() => toggleExample(example.name)}
                            >
                                ▶
                            </span>
                            <div 
                                className="example-info clickable"
                                onClick={() => handleExampleClick(example)}
                            >
                                <div className="example-name">
                                    <span className="category-badge">{example.category}</span>
                                    {example.name}
                                </div>
                                <div className="example-description">{example.description}</div>
                            </div>
                        </div>

                        {expandedItems[example.name] && (
                            <div className="example-details">
                                <pre className="json-preview">
                                    {formatJsonPreview(example.data)}
                                </pre>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Commission and Trim Button Rows */}
            <div className="button-rows">
                {/* Commission Row */}
                <div className="button-row">
                    <div className="button-row-label">Commission:</div>
                    <div className="button-group">
                        <button 
                            className={`selection-button ${selectedCommission === 0 ? 'selected' : ''}`}
                            onClick={() => handleCommissionTrimSelect('commission', 0)}
                        >
                            0
                        </button>
                        <button 
                            className={`selection-button ${selectedCommission === 1 ? 'selected' : ''}`}
                            onClick={() => handleCommissionTrimSelect('commission', 1)}
                        >
                            1
                        </button>
                        <button 
                            className={`selection-button ${selectedCommission === 2 ? 'selected' : ''}`}
                            onClick={() => handleCommissionTrimSelect('commission', 2)}
                        >
                            2
                        </button>
                    </div>
                </div>

                {/* Trim Row */}
                <div className="button-row">
                    <div className="button-row-label">Trim:</div>
                    <div className="button-group">
                        <button 
                            className={`selection-button ${selectedTrim === 0 ? 'selected' : ''}`}
                            onClick={() => handleCommissionTrimSelect('trim', 0)}
                        >
                            0
                        </button>
                        <button 
                            className={`selection-button ${selectedTrim === 1 ? 'selected' : ''}`}
                            onClick={() => handleCommissionTrimSelect('trim', 1)}
                        >
                            1
                        </button>
                        <button 
                            className={`selection-button ${selectedTrim === 2 ? 'selected' : ''}`}
                            onClick={() => handleCommissionTrimSelect('trim', 2)}
                        >
                            2
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamplesPanel;
