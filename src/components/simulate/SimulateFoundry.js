import React from 'react';
import LoadingButton from '../ui/LoadingButton';
import ResultDisplay from '../ui/ResultDisplay';
import { rpcUrlOptions } from '../../utils/networkConfig';

const SELECT_STYLES = {
  appearance: 'none',
  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: '16px',
  paddingRight: '40px',
  cursor: 'pointer'
};

const FormField = ({ label, type = "text", placeholder, value, onChange, options = null, autoComplete, name, required = false }) => (
  <div className="form-group">
    <label className="form-label">
      {label}
      {required && <span className="required-asterisk"> *</span>}
    </label>
    {options ? (
        <select
          className="foundry-input-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={SELECT_STYLES}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
    ) : (
      <input
        type={type}
        className="foundry-input-white"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        name={name}
      />
    )}
  </div>
);

const SimulateFoundry = ({ 
  formData,
  isSimulating,
  simulationResult,
  handleInputChange,
  showToast,
  updateSimulationStatus
}) => {
  const generateFoundryCommand = () => {
    // Validate required fields for Foundry
    if (!formData.from || !formData.to || !formData.calldata || !formData.rpcUrl) {
      showToast('Please fill in all required fields (From, To, Calldata, RPC URL)', 'error');
      return;
    }

    // Build the cast call command
    let command = 'cast call';
    
    // Add the target contract address
    command += ` ${formData.to}`;
    
    // Add the calldata
    command += ` "${formData.calldata}"`;
    
    // Add the --from flag
    command += ` --from ${formData.from}`;
    
    // Add the --rpc-url flag
    command += ` --rpc-url ${formData.rpcUrl}`;
    
    // Add msg.value if specified
    if (formData.msgValue && formData.msgValue !== '0' && formData.msgValue !== '') {
      const valueInWei = (parseFloat(formData.msgValue) * 1e18).toString();
      command += ` --value ${valueInWei}`;
    }
    
    // Add block height if specified
    if (formData.blockHeight && formData.blockHeight !== 'latest' && formData.blockHeight !== '') {
      command += ` --block ${formData.blockHeight}`;
    }

    // Add --trace flag for detailed execution trace
    command += ` --trace`;

    // Store the generated command in simulationResult for display
    updateSimulationStatus('simulationResult', { foundryCommand: command });
    showToast('Foundry command generated successfully!', 'success');
  };

  return (
    <div className="component-container">
      {/* Transaction Details */}
      <div className="form-row">
        <FormField
          label="From Address"
          type="text"
          placeholder="0x..."
          value={formData.from}
          onChange={(value) => handleInputChange('from', value)}
          required={true}
        />
        
        <FormField
          label="To Address"
          type="text"
          placeholder="0x..."
          value={formData.to}
          onChange={(value) => handleInputChange('to', value)}
          required={true}
        />
      </div>

      {/* RPC Configuration */}
      <div className="form-row">
        <FormField
          label="RPC Network"
          value={formData.rpcUrlPreset || 'custom'}
          onChange={(value) => handleInputChange('rpcUrlPreset', value)}
          options={rpcUrlOptions}
        />
        
        <FormField
          label="RPC URL"
          type="text"
          placeholder="https://..."
          value={formData.rpcUrl || ''}
          onChange={(value) => handleInputChange('rpcUrl', value)}
          required={true}
        />
      </div>

      {/* Transaction Parameters */}
      <div className="form-row">
        <FormField
          label="msg.value (ETH)"
          placeholder="0"
          value={formData.msgValue}
          onChange={(value) => handleInputChange('msgValue', value)}
        />
        
        <FormField
          label="Block Height"
          placeholder="latest"
          value={formData.blockHeight}
          onChange={(value) => handleInputChange('blockHeight', value)}
        />
      </div>

      {/* Calldata */}
      <FormField
        label="Calldata"
        placeholder="0x..."
        value={formData.calldata}
        onChange={(value) => handleInputChange('calldata', value)}
        required={true}
      />

      <div className="form-group submit-section">
        <LoadingButton
          type="submit"
          loading={isSimulating}
          className="component-button"
          onClick={generateFoundryCommand}
        >
          Generate Command
        </LoadingButton>
      </div>

      {simulationResult && simulationResult.foundryCommand && (
        <ResultDisplay
          result={simulationResult.foundryCommand}
          title="⚒️ Foundry Cast Call Command (with Trace)"
          onCopy={() => showToast('Command copied to clipboard!', 'success')}
        />
      )}
    </div>
  );
};

export default SimulateFoundry;
