import React from 'react';
import './DecodeCalldata.css';

const DecodeCalldata = ({ 
  value, 
  onChange, 
  onButtonClick, 
  result, 
  showToast 
}) => {
  return (
    <div className="component-container">
      <h2 className="component-title">Decode calldata</h2>
      <textarea
        value={value}
        onChange={onChange}
        placeholder="Enter calldata to decode... (with or without 0x prefix)"
        className="component-textarea"
      />
      <button
        onClick={onButtonClick}
        className="component-button"
      >
        Decode
      </button>
      
      {/* Display results */}
      {result && (
        <div className="result-container">
          {/* Clipboard icon in top-right corner */}
          <div
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(result, null, 2)).then(() => {
                showToast('Decode calldata result copied to clipboard!', 'success');
              }).catch(() => {
                showToast('Failed to copy decode result', 'error');
              });
            }}
            className="clipboard-icon"
            title="Copy decode result to clipboard"
          >
            📋
          </div>
          <pre className="result-content">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DecodeCalldata;
