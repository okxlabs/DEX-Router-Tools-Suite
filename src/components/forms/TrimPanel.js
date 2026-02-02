import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import './Panel.css';

// Conversion constant: 1% = 100 (4 decimals: 100% = 10^4 = 10,000)
const PERCENTAGE_TO_RATE_MULTIPLIER = 100;

/**
 * Convert percentage to rate value (with 4 decimals)
 * Example: 5% -> 500
 */
const percentageToRate = (percentage) => {
    if (!percentage || percentage === '') return '';
    const num = parseFloat(percentage);
    if (isNaN(num)) return '';
    return String(Math.round(num * PERCENTAGE_TO_RATE_MULTIPLIER));
};

const TrimPanel = forwardRef(({ onTrimChange }, ref) => {
    const [trimAddress, setTrimAddress] = useState('');
    const [trimPercentage, setTrimPercentage] = useState('');
    const [trimToB, setTrimToB] = useState(false);
    const [chargeAddress, setChargeAddress] = useState('');
    const [chargePercentage, setChargePercentage] = useState('');
    const [expectAmountOut, setExpectAmountOut] = useState('');

    // Use useEffect to notify parent whenever state changes
    // Convert percentage to rate before sending to parent
    useEffect(() => {
        if (onTrimChange) {
            onTrimChange({
                trim1: { 
                    address: trimAddress, 
                    rate: percentageToRate(trimPercentage), 
                    isToB: trimToB 
                },
                trim2: { 
                    address: chargeAddress, 
                    rate: percentageToRate(chargePercentage) 
                },
                expectAmountOut
            });
        }
    }, [trimAddress, trimPercentage, trimToB, chargeAddress, chargePercentage, expectAmountOut, onTrimChange]);

    // Expose reset method to parent
    useImperativeHandle(ref, () => ({
        reset: () => {
            setTrimAddress('');
            setTrimPercentage('');
            setTrimToB(false);
            setChargeAddress('');
            setChargePercentage('');
            setExpectAmountOut('');
        }
    }));

    return (
        <div className="trim-panel">
            <div className="panel-header">
                <span className="panel-title">Trim</span>
            </div>
            
            <div className="panel-content">
                <div className="trim-section">
                    <div className="section-subtitle">Trim</div>
                    <div className="trim-row">
                        <input
                            type="text"
                            className="panel-input"
                            placeholder="Address"
                            value={trimAddress}
                            onChange={(e) => setTrimAddress(e.target.value)}
                        />
                        <div className="rate-input-wrapper">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                className="panel-input rate-input-small"
                                placeholder="Rate"
                                value={trimPercentage}
                                onChange={(e) => setTrimPercentage(e.target.value)}
                            />
                            <span className="rate-unit">%</span>
                        </div>
                        <div className="trim-type-toggle">
                            <button
                                className={`tob-toggle ${!trimToB ? 'active' : ''}`}
                                onClick={() => setTrimToB(false)}
                            >
                                ToC
                            </button>
                            <button
                                className={`tob-toggle ${trimToB ? 'active' : ''}`}
                                onClick={() => setTrimToB(true)}
                            >
                                ToB
                            </button>
                        </div>
                    </div>
                </div>

                <div className="trim-section">
                    <div className="section-subtitle">Charge</div>
                    <div className="trim-row">
                        <input
                            type="text"
                            className="panel-input"
                            placeholder="Address"
                            value={chargeAddress}
                            onChange={(e) => setChargeAddress(e.target.value)}
                        />
                        <div className="rate-input-wrapper">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                className="panel-input rate-input-small"
                                placeholder="Rate"
                                value={chargePercentage}
                                onChange={(e) => setChargePercentage(e.target.value)}
                            />
                            <span className="rate-unit">%</span>
                        </div>
                    </div>
                </div>

                <div className="trim-section">
                    <div className="section-subtitle">Expect Amount Out</div>
                    <input
                        type="text"
                        className="panel-input"
                        placeholder="0"
                        value={expectAmountOut}
                        onChange={(e) => setExpectAmountOut(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
});

TrimPanel.displayName = 'TrimPanel';

export default TrimPanel;

