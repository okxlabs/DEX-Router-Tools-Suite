import React from 'react';
import CopyButton from './CopyButton';
import { formatJSON } from '../../utils/componentUtils';

const ResultDisplay = ({ 
  result, 
  title = "Result", 
  onCopy, 
  onEdit,
  onSimulate,
  className = "result-container",
  contentClassName = "result-content"
}) => {
  if (!result) return null;

  const formattedText = typeof result === 'string' ? result : formatJSON(result);

  return (
    <div className={`base-result-container ${className}`}>
      <div className="result-header">
        <span className="result-title">{title}</span>
        <div className="result-actions">
          {onEdit && (
            <button
              className="copy-button edit-button"
              onClick={() => onEdit(result)}
              title="Edit in Encode page"
            >
              Edit
            </button>
          )}
          {onSimulate && (
            <button
              className="copy-button simulate-button"
              onClick={() => onSimulate(result)}
              title="Simulate transaction"
            >
              Simulate
            </button>
          )}
          <CopyButton
            text={formattedText}
            onCopy={onCopy}
          />
        </div>
      </div>
      <pre className={`base-result-content ${contentClassName}`}>
        {formattedText}
      </pre>
    </div>
  );
};

export default ResultDisplay;
