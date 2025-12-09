import React, { useRef } from 'react';
import FunctionsPanel from './FunctionsPanel';
import CommissionPanel from './CommissionPanel';
import TrimPanel from './TrimPanel';
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
import { applyCommissionAndTrimToJson } from '../../utils/encode/commissionTrimUtils';

const EncodeCalldata = ({ 
  value, 
  onChange, 
  onButtonClick, 
  result, 
  showToast
}) => {
  const buttonState = useButtonState();
  const { isLoading, showSuccess, showError, lastProcessedValue, resetButtonStates, setButtonState } = buttonState;
  
  const commissionDataRef = useRef({ commissions: [], commissionToB: false, commissionTokenAddress: '' });
  const trimDataRef = useRef({ trim1: { address: '', rate: '', isToB: false }, trim2: { address: '', rate: '' }, expectAmountOut: '' });
  const commissionPanelRef = useRef(null);
  const trimPanelRef = useRef(null);

  const handleExampleSelect = (example) => {
    try {
      const completeJson = applyCommissionAndTrimToJson(example.data, commissionDataRef.current, trimDataRef.current);
      resetButtonStates();
      onChange({ target: { value: JSON.stringify(completeJson, null, 2) } });
    } catch (error) {
      console.error('Failed to load example:', error);
      showToast('Failed to load example', 'error');
    }
  };

  const handleCommissionChange = (commissionData) => {
    commissionDataRef.current = commissionData;
  };

  const handleTrimChange = (trimData) => {
    trimDataRef.current = trimData;
  };

  const handleGenerateClick = () => {
    const currentJson = safeJSONParse(value, showToast, 'Please enter JSON data first');
    if (!currentJson) return;
    
    try {
      const updatedJson = applyCommissionAndTrimToJson(currentJson, commissionDataRef.current, trimDataRef.current);
      const formattedJson = formatJSON(updatedJson);
      
      resetButtonStates();
      onChange({ target: { value: formattedJson } });
      showToast('JSON updated with commission and trim settings!', 'success');
    } catch (error) {
      showToast('Error: Failed to apply commission and trim settings', 'error');
      console.error('Generate JSON error:', error);
    }
  };

  const handleReset = () => {
    // Reset commission panel
    if (commissionPanelRef.current) {
      commissionPanelRef.current.reset();
    }
    
    // Reset trim panel
    if (trimPanelRef.current) {
      trimPanelRef.current.reset();
    }
    
    showToast('All fields have been reset!', 'success');
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

  return (
    <div className="encode-layout">
      <div className="encode-main-section">
        <div className="component-container">
          <FunctionsPanel 
            onExampleSelect={handleExampleSelect}
            showToast={showToast}
          />
          
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
            className="encode-result-container"
            contentClassName="encode-result-content"
          />
        </div>
      </div>
      
      <div className="encode-sidebar">
        <CommissionPanel ref={commissionPanelRef} onCommissionChange={handleCommissionChange} />
        <TrimPanel ref={trimPanelRef} onTrimChange={handleTrimChange} />
        <div className="sidebar-buttons">
          <button
            className="reset-button"
            onClick={handleReset}
            title="Reset all fields to default"
          >
            Reset
          </button>
          <button
            className="generate-button"
            onClick={handleGenerateClick}
            title="Apply commission and trim settings to current JSON"
          >
            Generate JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncodeCalldata;
