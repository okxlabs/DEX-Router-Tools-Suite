import { useState } from 'react';

/**
 * Custom hook for managing button states (loading, success, error)
 * Used by components that need to track processing states
 */
export const useButtonState = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [lastProcessedValue, setLastProcessedValue] = useState('');

  const resetButtonStates = () => {
    setShowSuccess(false);
    setShowError(false);
  };

  const setButtonState = (state, value = true) => {
    switch (state) {
      case 'loading':
        setIsLoading(value);
        break;
      case 'success':
        setShowSuccess(value);
        break;
      case 'error':
        setShowError(value);
        break;
      case 'lastProcessedValue':
        setLastProcessedValue(value);
        break;
      default:
        break;
    }
  };

  return {
    isLoading,
    showSuccess,
    showError,
    lastProcessedValue,
    resetButtonStates,
    setButtonState
  };
};

/**
 * Validates input and shows appropriate toast message
 * @param {string} input - The input value to validate
 * @param {string} emptyMessage - Message to show when input is empty
 * @param {function} showToast - Toast function
 * @returns {boolean} - Whether input is valid
 */
export const validateInput = (input, emptyMessage, showToast) => {
  if (!input.trim()) {
    showToast(emptyMessage, 'error');
    return false;
  }
  return true;
};

/**
 * Handles validation result and updates button states accordingly
 * @param {object} validationResult - Result from validation
 * @param {function} setButtonState - Function to set button state
 * @param {function} showToast - Toast function
 * @param {string} successMessage - Message for successful validation
 * @param {number} errorDuration - Duration for error toast
 */
export const handleValidationResult = (
  validationResult, 
  setButtonState, 
  showToast, 
  successMessage = '✅ Operation successful and validated!',
  errorDuration = 30000
) => {
  if (validationResult && validationResult.success !== undefined) {
    if (validationResult.success) {
      setButtonState('success', true);
      showToast(successMessage, 'success');
    } else {
      setButtonState('error', true);
      showToast(`${validationResult.summary}`, 'error', errorDuration);
      console.warn('Validation details:', validationResult);
    }
  } else {
    // Default to success for now
    setButtonState('success', true);
  }
  return validationResult;
};

/**
 * Generic error handler for processing operations
 * @param {Error} error - The error object
 * @param {function} setButtonState - Function to set button state
 * @param {function} showToast - Toast function
 * @param {string} errorMessage - Custom error message
 * @param {string} lastProcessedValue - Value being processed
 */
export const handleProcessingError = (
  error, 
  setButtonState, 
  showToast, 
  errorMessage, 
  lastProcessedValue
) => {
  setButtonState('error', true);
  setButtonState('lastProcessedValue', lastProcessedValue);
  showToast(errorMessage, 'error');
  console.error('Processing error:', error);
};

/**
 * Creates input change handler that resets button states when input changes
 * @param {function} onChange - Original onChange handler
 * @param {string} lastProcessedValue - Last processed value
 * @param {function} resetButtonStates - Function to reset button states
 * @returns {function} - Input change handler
 */
export const createInputChangeHandler = (onChange, lastProcessedValue, resetButtonStates) => {
  return (e) => {
    const newValue = e.target.value;
    
    // If input changed from last processed value, reset button states
    if (newValue.trim() !== lastProcessedValue) {
      resetButtonStates();
    }
    
    onChange(e);
  };
};

/**
 * Creates copy handler that shows toast messages
 * @param {function} showToast - Toast function
 * @returns {function} - Copy handler
 */
export const createCopyHandler = (showToast) => {
  return (status, message) => {
    showToast(message, status);
  };
};

/**
 * Processes operation with common error handling pattern
 * @param {function} operation - The operation to execute
 * @param {string} input - Input value
 * @param {string} emptyMessage - Message for empty input
 * @param {string} errorMessage - Message for operation failure
 * @param {function} showToast - Toast function
 * @param {object} buttonState - Button state object
 * @returns {Promise<any>} - Operation result
 */
export const processWithErrorHandling = async (
  operation,
  input,
  emptyMessage,
  errorMessage,
  showToast,
  buttonState
) => {
  const { resetButtonStates, setButtonState } = buttonState;

  if (!validateInput(input, emptyMessage, showToast)) {
    return { success: false };
  }

  // Reset states
  resetButtonStates();

  try {
    const result = operation();
    
    // Store the processed value
    setButtonState('lastProcessedValue', input.trim());
    
    return result;
  } catch (error) {
    handleProcessingError(error, setButtonState, showToast, errorMessage, input.trim());
    return { success: false };
  }
};

/**
 * Formats JSON with proper indentation
 * @param {any} data - Data to format
 * @param {number} spaces - Number of spaces for indentation
 * @returns {string} - Formatted JSON string
 */
export const formatJSON = (data, spaces = 2) => {
  return JSON.stringify(data, null, spaces);
};

/**
 * Safely parses JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {function} showToast - Toast function
 * @param {string} errorMessage - Error message for invalid JSON
 * @returns {object|null} - Parsed object or null if invalid
 */
export const safeJSONParse = (jsonString, showToast, errorMessage = 'Error: Invalid JSON format') => {
  try {
    return JSON.parse(jsonString.trim());
  } catch (error) {
    showToast(errorMessage, 'error');
    console.error('JSON parse error:', error);
    return null;
  }
};

/**
 * Creates decode operation handler with validation
 * @param {string} input - Input calldata
 * @param {function} decodeFunction - Function to decode calldata
 * @param {function} validateFunction - Function to validate decoded result
 * @param {function} showToast - Toast function
 * @param {function} setResult - Function to set result
 * @param {function} setValidation - Function to set validation result
 * @returns {object} - Operation result with success status
 */
export const createDecodeOperation = (
  input,
  decodeFunction,
  validateFunction,
  showToast,
  setResult,
  setValidation
) => {
  return () => {
    if (!validateInput(input, 'Please enter calldata to decode', showToast)) {
      return { success: false };
    }
    
    try {
      const originalCalldata = input.trim();
      const result = decodeFunction(originalCalldata);
      
      // Validate the decoded JSON by encoding it back
      const validation = validateFunction(originalCalldata, result);
      
      setResult(result);
      setValidation(validation);
      
      if (validation.success) {
        showToast('✅ Decoding successful and validated!', 'success');
      } else {
        showToast(`${validation.summary}`, 'error', 30000);
        console.warn('Reverse validation details:', validation);
      }
      
      return validation;
    } catch (error) {
      showToast('Error: Failed to decode calldata', 'error');
      setResult({ success: false, error: error.message });
      return { success: false };
    }
  };
};

/**
 * Creates encode operation handler with validation
 * @param {string} input - Input JSON string
 * @param {function} encodeFunction - Function to encode JSON
 * @param {function} validateFunction - Function to validate encoded result
 * @param {function} showToast - Toast function
 * @param {function} setResult - Function to set result
 * @param {function} setValidation - Function to set validation result
 * @returns {object} - Operation result with success status
 */
export const createEncodeOperation = (
  input,
  encodeFunction,
  validateFunction,
  showToast,
  setResult,
  setValidation
) => {
  return () => {
    if (!validateInput(input, 'Please enter json data to encode', showToast)) {
      return { success: false };
    }
    
    try {
      // Parse the JSON input
      const jsonData = safeJSONParse(input, showToast, 'Error: Invalid JSON format or encoding failed');
      if (!jsonData) {
        return { success: false };
      }
      
      // Encode the JSON data to calldata
      const result = encodeFunction(jsonData);
      
      // Validate the encoded calldata by decoding it back
      const validation = validateFunction(jsonData, result);
      
      setResult(result);
      setValidation(validation);
      
      if (validation.success) {
        showToast('✅ Encoding successful and validated!', 'success');
      } else {
        showToast(`${validation.summary}`, 'error', 30000);
        console.warn('Validation details:', validation);
      }
      
      return validation;
    } catch (error) {
      showToast('Error: Invalid JSON format or encoding failed', 'error');
      setResult('Error: ' + error.message);
      return { success: false };
    }
  };
};
