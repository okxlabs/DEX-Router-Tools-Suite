import React from 'react';
import CopyButton from './CopyButton';
import { formatJSON } from '../../scripts/componentUtils';

const ResultDisplay = ({ 
  result, 
  title = "Result", 
  onCopy, 
  onEdit,
  onFindHeight,
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
          {onFindHeight && (
            <button
              className="copy-button find-height-button"
              onClick={() => onFindHeight(result)}
              title="Find block height from timestamp (-1 hr)"
            >
              Find Height
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
