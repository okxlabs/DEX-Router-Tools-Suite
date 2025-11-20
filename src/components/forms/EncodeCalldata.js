import React from 'react';
import ExamplesPanel from './ExamplesPanel';
import LoadingButton from '../ui/LoadingButton';
import ResultDisplay from '../ui/ResultDisplay';
import { 
  useButtonState, 
  processWithErrorHandling, 
  handleValidationResult,
  createInputChangeHandler,
  createCopyHandler,
  safeJSONParse,
  formatJSON
} from '../../utils/componentUtils';

const EncodeCalldata = ({ 
  value, 
  onChange, 
  onButtonClick, 
  result, 
  showToast,
  onSimulate
}) => {
  const buttonState = useButtonState();
  const { isLoading, showSuccess, showError, lastProcessedValue, resetButtonStates, setButtonState } = buttonState;

  const handleExampleSelect = (exampleJson) => {
    resetButtonStates();
    onChange({ target: { value: exampleJson } });
  };

  const handleGenerateClick = (applyCommissionAndTrimToJson) => {
    const currentJson = safeJSONParse(value, showToast, 'Please enter JSON data first');
    if (!currentJson) return;
    
    try {
      const updatedJson = applyCommissionAndTrimToJson(currentJson);
      const formattedJson = formatJSON(updatedJson);
      
      resetButtonStates();
      onChange({ target: { value: formattedJson } });
      showToast('JSON updated with commission and trim settings!', 'success');
    } catch (error) {
      showToast('Error: Failed to apply commission and trim settings', 'error');
      console.error('Generate JSON error:', error);
    }
  };

  const handleEncode = async () => {
    const processResult = await processWithErrorHandling(
      onButtonClick,
      value,
      'Please enter JSON data to encode',
      'Failed to encode JSON',
      showToast,
      buttonState
    );

    if (processResult.success !== false) {
      handleValidationResult(
        processResult,
        setButtonState,
        showToast,
        '✅ Encoding successful and validated!'
      );
    }
  };

  const handleInputChange = createInputChangeHandler(onChange, lastProcessedValue, resetButtonStates);
  const handleCopy = createCopyHandler(showToast);
  
  const handleSimulate = () => {
    if (!result) {
      showToast('Please encode calldata first', 'error');
      return;
    }
    onSimulate(result);
  };

  return (
    <div className="encode-layout">
      <div className="encode-examples-section">
        <ExamplesPanel 
          onExampleSelect={handleExampleSelect}
          onGenerateClick={handleGenerateClick}
          showToast={showToast}
        />
      </div>
      
      <div className="encode-main-section">
        <div className="component-container">
          <textarea
            value={value}
            onChange={handleInputChange}
            placeholder="Enter JSON data to encode..."
            className="base-textarea encode-textarea"
          />
          
          <div className="button-row">
            <LoadingButton
              onClick={handleEncode}
              loading={isLoading}
              success={showSuccess}
              error={showError}
              className="component-button"
            >
              Encode Calldata
            </LoadingButton>
          </div>
          
          <ResultDisplay
            result={result}
            title="Encoded Calldata"
            onCopy={handleCopy}
            onSimulate={onSimulate ? handleSimulate : undefined}
            className="encode-result-container"
            contentClassName="encode-result-content"
          />
        </div>
      </div>
    </div>
  );
};

export default EncodeCalldata;
