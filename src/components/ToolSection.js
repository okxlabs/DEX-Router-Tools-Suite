import React from 'react';
import './ToolSection.css';

const ToolSection = ({ 
  title, 
  placeholder, 
  value, 
  onChange, 
  onButtonClick, 
  buttonText, 
  result, 
  showToast 
}) => {
  return (
    <div className="tool-section">
      <h2 className="tool-section-title">{title}</h2>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="tool-section-textarea"
      />
      <button
        onClick={onButtonClick}
        className="tool-section-button"
      >
        {buttonText}
      </button>
      
      {/* Display results */}
      {result && (
        <div className="result-container">
          {/* Clipboard icon in top-right corner */}
          <div
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(result, null, 2)).then(() => {
                showToast(`${title} result copied to clipboard!`, 'success');
              }).catch(() => {
                showToast(`Failed to copy ${title.toLowerCase()} result`, 'error');
              });
            }}
            className="clipboard-icon"
            title={`Copy ${title.toLowerCase()} result to clipboard`}
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

export default ToolSection;
