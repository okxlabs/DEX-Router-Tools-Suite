import React from 'react';
import ExamplesPanel from './ExamplesPanel';
import HelpTooltip from './HelpTooltip';

const EncodeCalldata = ({ 
  value, 
  onChange, 
  onButtonClick, 
  result, 
  showToast 
}) => {
  const handleExampleSelect = (exampleJson) => {
    onChange({ target: { value: exampleJson } });
  };

  const handleGenerateClick = (applyCommissionAndTrimToJson) => {
    try {
      // Parse the current JSON from the textarea
      if (!value.trim()) {
        showToast('Please enter JSON data first', 'error');
        return;
      }

      const currentJson = JSON.parse(value.trim());
      
      // Apply commission and trim settings to the current JSON
      const updatedJson = applyCommissionAndTrimToJson(currentJson);
      
      // Update the textarea with the new JSON
      const formattedJson = JSON.stringify(updatedJson, null, 2);
      onChange({ target: { value: formattedJson } });
      
      showToast('JSON updated with commission and trim settings!', 'success');
      
    } catch (error) {
      showToast('Error: Invalid JSON format', 'error');
      console.error('Generate JSON error:', error);
    }
  };

  return (
    <div className="encode-layout">
      {/* Left side - Examples */}
      <div className="encode-examples-section">
        <ExamplesPanel 
          onExampleSelect={handleExampleSelect}
          onGenerateClick={handleGenerateClick}
          showToast={showToast}
        />
      </div>
      
      {/* Right side - Encoder */}
      <div className="encode-main-section">
        <div className="component-container">
          <textarea
            value={value}
            onChange={onChange}
            placeholder="Enter json data to encode..."
            className="encode-textarea"
          />
          <button
            onClick={onButtonClick}
            className="component-button"
          >
            Encode
          </button>
          
          {/* Display results */}
          {result && (
            <div className="encode-result-container">
              {/* Clipboard icon in top-right corner */}
              <div
                onClick={() => {
                  const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                  navigator.clipboard.writeText(resultText).then(() => {
                    showToast('Encoded calldata copied to clipboard!', 'success');
                  }).catch(() => {
                    showToast('Failed to copy encoded calldata', 'error');
                  });
                }}
                className="clipboard-icon"
                title="Copy encoded calldata to clipboard"
              >
                📋
              </div>
              <pre className="encode-result-content">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EncodeCalldata;
