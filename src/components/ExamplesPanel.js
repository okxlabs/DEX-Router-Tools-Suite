import React, { useState } from 'react';
import './ExamplesPanel.css';
import { getFunctionExamples } from '../utils/encode/jsonFunctionUtils';
import { applyCommissionAndTrimToJson } from '../utils/encode/commissionTrimUtils';

const ExamplesPanel = ({ onExampleSelect, showToast, onGenerateClick }) => {
    // Commission state - address, rate, token type
    const [commission1, setCommission1] = useState({ address: '', rate: '', isFromToken: true });
    const [commission2, setCommission2] = useState({ address: '', rate: '', isFromToken: true });
    const [commission3, setCommission3] = useState({ address: '', rate: '', isFromToken: true });
    
    // Shared commission settings
    const [commissionToB, setCommissionToB] = useState(false);
    const [commissionTokenAddress, setCommissionTokenAddress] = useState('');
    
    // Trim state - address and rate pairs
    const [trim1, setTrim1] = useState({ address: '', rate: '', isToB: false });
    const [trim2, setTrim2] = useState({ address: '', rate: '' });
    
    // Shared trim settings
    const [expectAmountOut, setExpectAmountOut] = useState('');

    // Get examples from utility function
    const examples = getFunctionExamples();


    const handleExampleClick = (example) => {
        // Generate complete JSON with function + commission + trim based on current state
        generateCompleteJson(example);
    };

    // Helper function to get current commission and trim data
    const getCurrentCommissionAndTrimData = () => {
        const commissionData = {
            commission1,
            commission2,
            commission3,
            commissionToB,
            commissionTokenAddress
        };

        const trimData = {
            trim1,
            trim2,
            expectAmountOut
        };

        return { commissionData, trimData };
    };

    const generateCompleteJson = async (example) => {
        try {
            // Get current commission and trim data
            const { commissionData, trimData } = getCurrentCommissionAndTrimData();
            
            // Apply commission and trim to the example data
            const completeJson = applyCommissionAndTrimToJson(example.data, commissionData, trimData);

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
            const { commissionData, trimData } = getCurrentCommissionAndTrimData();
            onGenerateClick((baseJson) => applyCommissionAndTrimToJson(baseJson, commissionData, trimData));
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
                                className="address-input long-input"
                                placeholder="Token Address"
                                value={commissionTokenAddress}
                                onChange={(e) => setCommissionTokenAddress(e.target.value)}
                            />
                            <button
                                className={`toggle-button ${commissionToB ? 'active' : ''}`}
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
                            <button
                                className={`toggle-button ${trim1.isToB ? 'active' : ''}`}
                                onClick={() => handleTrimChange(1, 'isToB', !trim1.isToB)}
                            >
                                ToB Trim
                            </button>
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
                        </div>
                        
                        {/* Expect Amount Out Row */}
                        <div className="input-row">
                            <input
                                type="text"
                                className="address-input long-input"
                                placeholder="Expect Amount Out"
                                value={expectAmountOut}
                                onChange={(e) => setExpectAmountOut(e.target.value)}
                            />
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
