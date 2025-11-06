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
import dagSwapByOrderId from '../utils/examples/dagSwapByOrderId.json';
import approve from '../utils/examples/approve.json';

const ExamplesPanel = ({ onExampleSelect, showToast, onGenerateClick }) => {
    
    // Commission state - address, rate, token type
    const [commission1, setCommission1] = useState({ address: '', rate: '', isFromToken: true });
    const [commission2, setCommission2] = useState({ address: '', rate: '', isFromToken: true });
    const [commission3, setCommission3] = useState({ address: '', rate: '', isFromToken: true });
    
    // Shared commission settings
    const [commissionToB, setCommissionToB] = useState(false);
    const [commissionTokenAddress, setCommissionTokenAddress] = useState('');
    
    // Trim state - address and rate pairs
    const [trim1, setTrim1] = useState({ address: '', rate: '' });
    const [trim2, setTrim2] = useState({ address: '', rate: '' });
    
    // Shared trim settings
    const [expectAmountOut, setExpectAmountOut] = useState('');

    // Organize examples by category
    const examples = [
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


    const handleExampleClick = (example) => {
        // Generate complete JSON with function + commission + trim based on current state
        generateCompleteJson(example);
    };

    // Extract commission and trim generation logic into reusable function
    const applyCommissionAndTrimToJson = (baseJson) => {
        let completeJson = { ...baseJson };

        // Check if this is a function that should NOT have commission/trim
        const functionsWithoutCommissionTrim = ['approve', 'swapWrap'];
        const functionName = baseJson.function?.name;
        
        if (functionsWithoutCommissionTrim.includes(functionName)) {
            // For ERC20 and utility functions, remove any existing commission/trim data and return
            delete completeJson.hasCommission;
            delete completeJson.referCount;
            delete completeJson.first;
            delete completeJson.last;
            delete completeJson.middle;
            delete completeJson.hasTrim;
            delete completeJson.trimRate;
            delete completeJson.trimAddress;
            delete completeJson.expectAmountOut;
            delete completeJson.chargeRate;
            delete completeJson.chargeAddress;
            return completeJson;
        }

        // For DEX router functions, handle commission and trim data based on inputs
        
        // Generate commission data from inputs (0, 1, or 2)
        const hasCommission1 = commission1.address && commission1.rate;
        const hasCommission2 = commission2.address && commission2.rate;
        const hasCommission3 = commission3.address && commission3.rate;
        const commissionCount = (hasCommission1 ? 1 : 0) + (hasCommission2 ? 1 : 0) + (hasCommission3 ? 1 : 0);
        
        if (commissionCount > 0) {
            completeJson.hasCommission = true;
            completeJson.referCount = commissionCount;
            
            if (commissionCount === 3) {
                 // Triple commission
                 completeJson.first = {
                     flag: commission1.isFromToken ? "0x33330afc2aaa" : "0x33330afc2bbb",
                     commissionType: commission1.isFromToken ? "TRIPLE_FROM_TOKEN_COMMISSION" : "TRIPLE_TO_TOKEN_COMMISSION",
                     rate: commission1.rate,
                     address: commission1.address
                 };
                 completeJson.second = {
                     flag: commission2.isFromToken ? "0x33330afc2aaa" : "0x33330afc2bbb", 
                     commissionType: commission2.isFromToken ? "TRIPLE_FROM_TOKEN_COMMISSION" : "TRIPLE_TO_TOKEN_COMMISSION",
                     rate: commission2.rate,
                     address: commission2.address
                 };
                 completeJson.middle = {
                     isToB: commissionToB,
                     token: commissionTokenAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
                 };
                 completeJson.third = {
                     flag: commission3.isFromToken ? "0x33330afc2aaa" : "0x33330afc2bbb",
                     commissionType: commission3.isFromToken ? "TRIPLE_FROM_TOKEN_COMMISSION" : "TRIPLE_TO_TOKEN_COMMISSION",
                     rate: commission3.rate,
                     address: commission3.address
                 };
                 // Remove last property for triple commission
                 delete completeJson.last;
            } else if (commissionCount === 2) {
                // Dual commission
                completeJson.first = {
                    flag: commission1.isFromToken ? "0x22220afc2aaa" : "0x22220afc2bbb",
                    commissionType: commission1.isFromToken ? "DUAL_FROM_TOKEN_COMMISSION" : "DUAL_TO_TOKEN_COMMISSION",
                    rate: commission1.rate,
                    address: commission1.address
                };
                completeJson.last = {
                    flag: commission2.isFromToken ? "0x22220afc2aaa" : "0x22220afc2bbb", 
                    commissionType: commission2.isFromToken ? "DUAL_FROM_TOKEN_COMMISSION" : "DUAL_TO_TOKEN_COMMISSION",
                    rate: commission2.rate,
                    address: commission2.address
                };
                completeJson.middle = {
                    isToB: commissionToB,
                    token: commissionTokenAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
                };
            } else {
                // Single commission (use first non-empty one)
                const activeCommission = hasCommission1 ? commission1 : (hasCommission2 ? commission2 : commission3);
                completeJson.first = {
                    flag: activeCommission.isFromToken ? "0x3ca20afc2aaa" : "0x3ca20afc2bbb",
                    commissionType: activeCommission.isFromToken ? "SINGLE_FROM_TOKEN_COMMISSION" : "SINGLE_TO_TOKEN_COMMISSION",
                    rate: activeCommission.rate,
                    address: activeCommission.address
                };
                completeJson.middle = {
                    isToB: commissionToB,
                    token: commissionTokenAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
                };
                // Remove last property for single commission
                delete completeJson.last;
            }
        } else {
            // No commission data - remove all commission-related fields
            completeJson.hasCommission = false;
            delete completeJson.referCount;
            delete completeJson.first;
            delete completeJson.second;
            delete completeJson.third;
            delete completeJson.last;
            delete completeJson.middle;
        }

        // Generate trim data from inputs (0, 1, or 2)
        const hasTrim1 = trim1.address && trim1.rate;
        const hasTrim2 = trim2.address && trim2.rate;
        const trimCount = (hasTrim1 ? 1 : 0) + (hasTrim2 ? 1 : 0);
        
        if (trimCount > 0) {
            completeJson.hasTrim = true;
            
            // Auto-convert: if only trim2 is filled, treat it as trim1
            if (!hasTrim1 && hasTrim2) {
                completeJson.trimRate = trim2.rate;
                completeJson.trimAddress = trim2.address;
            } else if (hasTrim1 && !hasTrim2) {
                // Only trim1 is filled
                completeJson.trimRate = trim1.rate;
                completeJson.trimAddress = trim1.address;
            } else if (hasTrim1 && hasTrim2) {
                // Both are filled
                completeJson.trimRate = trim1.rate;
                completeJson.trimAddress = trim1.address;
                completeJson.chargeRate = trim2.rate;
                completeJson.chargeAddress = trim2.address;
            }
            
            // Always add expectAmountOut and default charge values for single trim
            completeJson.expectAmountOut = expectAmountOut || "100";
            if (trimCount === 1) {
                completeJson.chargeRate = "0";
                completeJson.chargeAddress = "0x0000000000000000000000000000000000000000";
            }
        } else {
            // No trim data - remove all trim-related fields
            completeJson.hasTrim = false;
            delete completeJson.trimRate;
            delete completeJson.trimAddress;
            delete completeJson.expectAmountOut;
            delete completeJson.chargeRate;
            delete completeJson.chargeAddress;
        }

        return completeJson;
    };

    const generateCompleteJson = async (example) => {
        try {
            // Apply commission and trim to the example data
            const completeJson = applyCommissionAndTrimToJson(example.data);

            // Load the complete JSON into the encoder
            onExampleSelect(JSON.stringify(completeJson, null, 2));
            showToast(`${example.name} loaded!`, 'success');

        } catch (error) {
            console.error('Failed to generate complete JSON:', error);
            showToast('Failed to load configuration', 'error');
        }
    };

    // Input change handlers
    const handleCommissionChange = (index, field, value) => {
        if (index === 1) {
            setCommission1(prev => ({ ...prev, [field]: value }));
        } else if (index === 2) {
            setCommission2(prev => ({ ...prev, [field]: value }));
        } else {
            setCommission3(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleTrimChange = (index, field, value) => {
        if (index === 1) {
            setTrim1(prev => ({ ...prev, [field]: value }));
        } else {
            setTrim2(prev => ({ ...prev, [field]: value }));
        }
    };

    // Handle generate button click
    const handleGenerateClick = () => {
        if (onGenerateClick) {
            onGenerateClick(applyCommissionAndTrimToJson);
        }
    };



    return (
        <div className="examples-panel">
            <div className="examples-list">
                {examples.map((example) => (
                    <div key={example.name} className="example-item">
                        <div 
                            className="example-header clickable"
                            onClick={() => handleExampleClick(example)}
                        >
                            <div className="example-name">
                                <span className="category-badge">{example.category}</span>
                                {example.name}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Commission and Trim Input Grid */}
            <div className="input-grid-section">
                {/* Commission Section */}
                <div className="input-section">
                    <div className="section-label">Commission</div>
                    <div className="input-grid">
                        {/* Commission 1 */}
                        <div className="input-row">
                            <input
                                type="text"
                                className="address-input"
                                placeholder="Referrer 1 Address"
                                value={commission1.address}
                                onChange={(e) => handleCommissionChange(1, 'address', e.target.value)}
                            />
                            <input
                                type="number"
                                className="rate-input"
                                placeholder="Rate (Decimal: 9)"
                                value={commission1.rate}
                                onChange={(e) => handleCommissionChange(1, 'rate', e.target.value)}
                            />
                            <div className="toggle-group">
                                <button
                                    className={`toggle-button ${commission1.isFromToken ? 'active' : ''}`}
                                    onClick={() => handleCommissionChange(1, 'isFromToken', true)}
                                >
                                    FromToken
                                </button>
                                <button
                                    className={`toggle-button ${!commission1.isFromToken ? 'active' : ''}`}
                                    onClick={() => handleCommissionChange(1, 'isFromToken', false)}
                                >
                                    ToToken
                                </button>
                            </div>
                        </div>
                        
                        {/* Commission 2 */}
                        <div className="input-row">
                            <input
                                type="text"
                                className="address-input"
                                placeholder="Referrer 2 Address"
                                value={commission2.address}
                                onChange={(e) => handleCommissionChange(2, 'address', e.target.value)}
                            />
                            <input
                                type="number"
                                className="rate-input"
                                placeholder="Rate (Decimal: 9)"
                                value={commission2.rate}
                                onChange={(e) => handleCommissionChange(2, 'rate', e.target.value)}
                            />
                            <div className="toggle-group">
                                <button
                                    className={`toggle-button ${commission2.isFromToken ? 'active' : ''}`}
                                    onClick={() => handleCommissionChange(2, 'isFromToken', true)}
                                >
                                    FromToken
                                </button>
                                <button
                                    className={`toggle-button ${!commission2.isFromToken ? 'active' : ''}`}
                                    onClick={() => handleCommissionChange(2, 'isFromToken', false)}
                                >
                                    ToToken
                                </button>
                            </div>
                        </div>
                        
                        {/* Commission 3 */}
                        <div className="input-row">
                            <input
                                type="text"
                                className="address-input"
                                placeholder="Referrer 3 Address"
                                value={commission3.address}
                                onChange={(e) => handleCommissionChange(3, 'address', e.target.value)}
                            />
                            <input
                                type="number"
                                className="rate-input"
                                placeholder="Rate (Decimal: 9)"
                                value={commission3.rate}
                                onChange={(e) => handleCommissionChange(3, 'rate', e.target.value)}
                            />
                            <div className="toggle-group">
                                <button
                                    className={`toggle-button ${commission3.isFromToken ? 'active' : ''}`}
                                    onClick={() => handleCommissionChange(3, 'isFromToken', true)}
                                >
                                    FromToken
                                </button>
                                <button
                                    className={`toggle-button ${!commission3.isFromToken ? 'active' : ''}`}
                                    onClick={() => handleCommissionChange(3, 'isFromToken', false)}
                                >
                                    ToToken
                                </button>
                            </div>
                        </div>
                        
                        {/* Shared Commission Settings Row */}
                        <div className="input-row">
                            <input
                                type="text"
                                className="address-input token-address"
                                placeholder="Token Address"
                                value={commissionTokenAddress}
                                onChange={(e) => setCommissionTokenAddress(e.target.value)}
                            />
                            <button
                                className={`toggle-button tob-button ${commissionToB ? 'active' : ''}`}
                                onClick={() => setCommissionToB(!commissionToB)}
                            >
                                ToB Commission
                            </button>
                        </div>
                    </div>
                </div>

                {/* Trim Section */}
                <div className="input-section">
                    <div className="section-label">Trim</div>
                    <div className="input-grid">
                        {/* Trim 1 */}
                        <div className="input-row">
                            <input
                                type="text"
                                className="address-input"
                                placeholder="Trim Address"
                                value={trim1.address}
                                onChange={(e) => handleTrimChange(1, 'address', e.target.value)}
                            />
                            <input
                                type="number"
                                className="rate-input"
                                placeholder="Rate (Decimal: 4)"
                                value={trim1.rate}
                                onChange={(e) => handleTrimChange(1, 'rate', e.target.value)}
                            />
                            <div className="toggle-group-spacer"></div> {/* Spacer to match toggle group width */}
                        </div>
                        
                        {/* Trim 2 */}
                        <div className="input-row">
                            <input
                                type="text"
                                className="address-input"
                                placeholder="Charge Address"
                                value={trim2.address}
                                onChange={(e) => handleTrimChange(2, 'address', e.target.value)}
                            />
                            <input
                                type="number"
                                className="rate-input"
                                placeholder="Rate (Decimal: 4)"
                                value={trim2.rate}
                                onChange={(e) => handleTrimChange(2, 'rate', e.target.value)}
                            />
                            <div className="toggle-group-spacer"></div> {/* Spacer to match toggle group width */}
                        </div>
                        
                        {/* Expect Amount Out Row */}
                        <div className="input-row">
                            <input
                                type="text"
                                className="address-input expect-amount"
                                placeholder="Expect Amount Out"
                                value={expectAmountOut}
                                onChange={(e) => setExpectAmountOut(e.target.value)}
                            />
                            <div className="toggle-group-spacer"></div> {/* Spacer to match toggle group width */}
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                <div className="generate-section">
                    <button
                        className="generate-button"
                        onClick={handleGenerateClick}
                        title="Apply commission and trim settings to current JSON"
                    >
                        Generate JSON
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExamplesPanel;
