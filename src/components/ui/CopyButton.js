import React from 'react';

const CopyButton = ({ 
  text, 
  onCopy, 
  className = '',
  children,
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
      title={props.title || "Copy to clipboard"}
    >
      {children || 'Copy'}
    </button>
  );
};

export default CopyButton;

