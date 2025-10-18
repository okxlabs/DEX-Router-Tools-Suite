import React from 'react';
import ExamplesPanel from './ExamplesPanel';

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

  return (
    <div className="encode-layout">
      {/* Left side - Examples */}
      <div className="encode-examples-section">
        <ExamplesPanel 
          onExampleSelect={handleExampleSelect}
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
