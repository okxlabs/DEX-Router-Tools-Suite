import React from 'react';
import LoadingButton from '../ui/LoadingButton';
import ResultDisplay from '../ui/ResultDisplay';
import { 
  useButtonState, 
  processWithErrorHandling, 
  handleValidationResult,
  createInputChangeHandler,
  createCopyHandler
} from '../../utils/componentUtils';

const DecodeCalldata = ({ 
  value, 
  onChange, 
  onButtonClick, 
  result, 
  showToast,
  onEdit
}) => {
  const buttonState = useButtonState();
  const { isLoading, showSuccess, showError, lastProcessedValue, resetButtonStates, setButtonState } = buttonState;

  const handleDecode = async () => {
    const processResult = await processWithErrorHandling(
      onButtonClick,
      value,
      'Please enter calldata to decode',
      'Failed to decode calldata',
      showToast,
      buttonState
    );

    if (processResult.success !== false) {
      handleValidationResult(
        processResult,
        setButtonState,
        showToast,
        '✅ Decoding successful and validated!'
      );
    }
  };

  const handleInputChange = createInputChangeHandler(onChange, lastProcessedValue, resetButtonStates);
  const handleCopy = createCopyHandler(showToast);

  return (
    <div className="component-container">
      <textarea
        value={value}
        onChange={handleInputChange}
        placeholder="Enter calldata to decode... (0x1234abcd...)"
        className="base-textarea component-textarea"
      />
      
      <div className="button-row">
        <LoadingButton
          onClick={handleDecode}
          loading={isLoading}
          success={showSuccess}
          error={showError}
          className="component-button"
        >
          Decode Calldata
        </LoadingButton>
      </div>
      
      <ResultDisplay
        result={result}
        title="Decoded Result"
        onCopy={handleCopy}
        onEdit={onEdit}
      />
    </div>
  );
};

export default DecodeCalldata;
