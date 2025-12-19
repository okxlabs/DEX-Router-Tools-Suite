import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import './Panel.css';

// Conversion constant: 1% = 10,000,000 (9 decimals: 100% = 10^9)
const PERCENTAGE_TO_RATE_MULTIPLIER = 10000000;

/**
 * Convert percentage to rate value (with 9 decimals)
 * Example: 5% -> 50,000,000
 */
const percentageToRate = (percentage) => {
    if (!percentage || percentage === '') return '';
    const num = parseFloat(percentage);
    if (isNaN(num)) return '';
    return String(Math.round(num * PERCENTAGE_TO_RATE_MULTIPLIER));
};

const CommissionPanel = forwardRef(({ onCommissionChange }, ref) => {
    const [commissionToB, setCommissionToB] = useState(false);
    const [commissionTokenAddress, setCommissionTokenAddress] = useState('');
    // Store percentage values in state for better UX
    const [commissions, setCommissions] = useState([
        { id: Date.now(), address: '', percentage: '', isFromToken: true },
        { id: Date.now() + 1, address: '', percentage: '', isFromToken: true },
        { id: Date.now() + 2, address: '', percentage: '', isFromToken: true }
    ]);

    const handleToBChange = (value) => {
        setCommissionToB(value);
    };

    const handleTokenAddressChange = (value) => {
        setCommissionTokenAddress(value);
    };

    const addCommission = () => {
        if (commissions.length >= 8) return;
        const newCommissions = [...commissions, { id: Date.now(), address: '', percentage: '', isFromToken: true }];
        setCommissions(newCommissions);
    };

    const removeCommission = (id) => {
        const newCommissions = commissions.filter(c => c.id !== id);
        setCommissions(newCommissions);
    };

    const updateCommission = (id, field, value) => {
        const newCommissions = commissions.map(c => 
            c.id === id ? { ...c, [field]: value } : c
        );
        setCommissions(newCommissions);
    };

    // Use useEffect to notify parent whenever state changes
    // Convert percentage to rate before sending to parent
    useEffect(() => {
        if (onCommissionChange) {
            // Convert percentages to rates for backend processing
            const commissionsWithRates = commissions.map(c => ({
                ...c,
                rate: percentageToRate(c.percentage)
            }));
            
            onCommissionChange({
                commissions: commissionsWithRates,
                commissionToB,
                commissionTokenAddress
            });
        }
    }, [commissions, commissionToB, commissionTokenAddress, onCommissionChange]);

    // Expose reset method to parent
    useImperativeHandle(ref, () => ({
        reset: () => {
            setCommissionToB(false);
            setCommissionTokenAddress('');
            setCommissions([
                { id: Date.now(), address: '', percentage: '', isFromToken: true },
                { id: Date.now() + 1, address: '', percentage: '', isFromToken: true },
                { id: Date.now() + 2, address: '', percentage: '', isFromToken: true }
            ]);
        }
    }));

    return (
        <div className="commission-panel">
            <div className="panel-header">
                <span className="panel-title">Commission ({commissions.length}/8)</span>
                <button 
                    className="add-button" 
                    onClick={addCommission}
                    disabled={commissions.length >= 8}
                >
                    + Add
                </button>
            </div>
            
            <div className="panel-content">
                <div className="token-address-row">
                    <input
                        type="text"
                        className="panel-input"
                        placeholder="Token Address (Default: ETH)"
                        value={commissionTokenAddress}
                        onChange={(e) => handleTokenAddressChange(e.target.value)}
                    />
                    <button
                        className={`tob-toggle ${commissionToB ? 'active' : ''}`}
                        onClick={() => handleToBChange(!commissionToB)}
                    >
                        ToB
                    </button>
                </div>

                <div className="commissions-list">
                    {commissions.map((commission) => (
                        <div key={commission.id} className="commission-item">
                            <input
                                type="text"
                                className="panel-input"
                                placeholder="Address"
                                value={commission.address}
                                onChange={(e) => updateCommission(commission.id, 'address', e.target.value)}
                            />
                            <div className="rate-input-wrapper">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="panel-input rate-input-small"
                                    placeholder="Rate"
                                    value={commission.percentage}
                                    onChange={(e) => updateCommission(commission.id, 'percentage', e.target.value)}
                                />
                                <span className="rate-unit">%</span>
                            </div>
                            <div className="token-toggle-group">
                                <button
                                    className={`token-toggle ${commission.isFromToken ? 'active' : ''}`}
                                    onClick={() => updateCommission(commission.id, 'isFromToken', true)}
                                    title="From Token"
                                >
                                    From
                                </button>
                                <button
                                    className={`token-toggle ${!commission.isFromToken ? 'active' : ''}`}
                                    onClick={() => updateCommission(commission.id, 'isFromToken', false)}
                                    title="To Token"
                                >
                                    To
                                </button>
                            </div>
                            <button
                                className="remove-button"
                                onClick={() => removeCommission(commission.id)}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

CommissionPanel.displayName = 'CommissionPanel';

export default CommissionPanel;

