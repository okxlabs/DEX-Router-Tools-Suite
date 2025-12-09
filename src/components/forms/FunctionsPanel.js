import React, { useState } from 'react';
import './Panel.css';
import { getFunctionExamples } from '../../utils/encode/jsonFunctionUtils';

const FunctionsPanel = ({ onExampleSelect, showToast }) => {
    const [selectedValue, setSelectedValue] = useState('');
    const examples = getFunctionExamples();

    const handleChange = (value) => {
        setSelectedValue(value);
        if (value) {
            const selectedExample = examples.find(ex => ex.name === value);
            if (selectedExample) {
                onExampleSelect(selectedExample);
                showToast(`${selectedExample.name} loaded!`, 'success');
            }
        }
    };

    return (
        <div className="functions-panel">
            <select
                className="foundry-input-white"
                value={selectedValue}
                onChange={(e) => handleChange(e.target.value)}
            >
                <option value="">Select a function...</option>
                {examples.map((example) => (
                    <option key={example.name} value={example.name}>
                        {example.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default FunctionsPanel;

