import React from 'react';
import CopyButton from './CopyButton';
import { formatJSON, checksumAddressesInObject } from '../../scripts/componentUtils';

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

  const formattedText = typeof result === 'string'
    ? result
    : formatJSON(checksumAddressesInObject(result));

  // Show "Copy no 0x" button when result looks like hex calldata
  const isHexCalldata = typeof result === 'string' && result.startsWith('0x');

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
          {isHexCalldata && (
            <CopyButton
              text={formattedText.slice(2)}
              onCopy={onCopy}
              title="Copy without 0x prefix"
            >
              Copy no 0x
            </CopyButton>
          )}
          <CopyButton
            text={formattedText}
            onCopy={onCopy}
          />
        </div>
      </div>
      <div className="result-body">
        <pre className={`base-result-content ${contentClassName}`}>
          {formattedText}
        </pre>
      </div>
    </div>
  );
};

export default ResultDisplay;
