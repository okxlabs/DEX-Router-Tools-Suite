import React from 'react';

const CopyButton = ({ 
  text, 
  onCopy, 
  className = '',
  ...props 
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onCopy?.('success', 'Copied to clipboard!');
    } catch (error) {
      onCopy?.('error', 'Failed to copy');
    }
  };

  return (
    <button
      {...props}
      className={`copy-button ${className}`}
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      Copy
    </button>
  );
};

export default CopyButton;

