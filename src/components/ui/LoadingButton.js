import React from 'react';

const LoadingButton = ({ 
  onClick, 
  loading = false, 
  success = false,
  error = false,
  children, 
  className = '',
  disabled = false,
  ...props 
}) => {
  const handleClick = (e) => {
    if (loading || disabled) return;
    onClick?.(e);
  };

  const getButtonClass = () => {
    let classes = `loading-button ${className}`;
    if (loading) classes += ' loading';
    if (success) classes += ' success';
    if (error) classes += ' error';
    if (disabled) classes += ' disabled';
    return classes;
  };

  const getButtonContent = () => {
    if (loading) {
      return (
        <div className="button-content loading-content">
          <div className="spinner"></div>
          <span>Processing...</span>
        </div>
      );
    }
    
    if (success) {
      return (
        <div className="button-content success-content">
          <span className="success-icon">✅</span>
          <span>Success!</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="button-content error-content">
          <span className="error-icon">❌</span>
          <span>Fail!</span>
        </div>
      );
    }
    
    return <div className="button-content">{children}</div>;
  };

  return (
    <button
      {...props}
      className={getButtonClass()}
      onClick={handleClick}
      disabled={loading || disabled}
    >
      {getButtonContent()}
    </button>
  );
};

export default LoadingButton;
