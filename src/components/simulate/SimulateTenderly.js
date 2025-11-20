import React from 'react';
import axios from 'axios';
import LoadingButton from '../ui/LoadingButton';
import { chainOptions } from '../../utils/networkConfig';

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

const SimulationSuccessCard = ({ accountSlug, projectSlug, simulationResult }) => (
  <div className="simulation-success-card">
    <label className="form-label">🎉 Simulation Complete!</label>
    
    <div className="tenderly-card">
      <div className="card-header">
        <div className="card-icon">🔍</div>
        <div className="card-content">
          <h3>View in Tenderly Dashboard</h3>
          <p>Analyze your transaction simulation with detailed traces and logs</p>
        </div>
      </div>
      
      <a
        href={`https://dashboard.tenderly.co/${accountSlug}/${projectSlug}/simulator/${simulationResult.simulation?.id || simulationResult.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="tenderly-link"
      >
        🚀 Open Tenderly Simulation →
      </a>
    </div>
  </div>
);

const SimulateTenderly = ({ 
  formData,
  isSimulating,
  simulationResult,
  handleInputChange,
  showToast,
  updateSimulationStatus
}) => {
  const simulateTransaction = async () => {
    // Validate required fields
    if (!formData.accountSlug || !formData.projectSlug || !formData.tenderlyApiKey) {
      showToast('Please fill in Account Slug, Project Slug, and Tenderly API Key', 'error');
      return;
    }

    if (!formData.from || !formData.to || !formData.calldata || !formData.customChainId) {
      showToast('Please fill in all transaction fields (From, To, Calldata, Chain ID)', 'error');
      return;
    }

    updateSimulationStatus('isSimulating', true);
    updateSimulationStatus('simulationResult', null);

    try {
      const simulationPayload = {
        'network_id': formData.customChainId,
        'from': formData.from,
        'to': formData.to,
        'input': formData.calldata,
        'gas': 100000000,
        'value': formData.msgValue ? (parseFloat(formData.msgValue) * 1e18).toString() : '0',
        'save': true,
        'save_if_fails': true,
        'simulation_type': 'full'
      };

      if (formData.blockHeight && formData.blockHeight !== 'latest' && formData.blockHeight !== '') {
        simulationPayload.block_number = parseInt(formData.blockHeight);
      }

      const response = await axios.post(
        `https://api.tenderly.co/api/v1/account/${formData.accountSlug}/project/${formData.projectSlug}/simulate`,
        simulationPayload,
        {
          headers: {
            'X-Access-Key': formData.tenderlyApiKey,
            'content-type': 'application/json'
          }
        }
      );

      updateSimulationStatus('simulationResult', response.data);
      showToast('Transaction simulation completed successfully! Click the link below to view in Tenderly.', 'success');

    } catch (error) {
      console.error('Simulation error:', error);
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Unknown error occurred';
      showToast(`Simulation failed: ${errorMessage}`, 'error');
    } finally {
      updateSimulationStatus('isSimulating', false);
    }
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

      {/* Network Configuration */}
      <div className="form-row">
        <FormField
          label="Blockchain Network"
          value={formData.chainId}
          onChange={(value) => handleInputChange('chainId', value)}
          options={chainOptions}
        />
        
        <FormField
          label="Chain ID"
          placeholder="Chain ID (e.g., 1 for Ethereum)"
          required={true}
          value={formData.customChainId}
          onChange={(value) => handleInputChange('customChainId', value)}
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

      {/* Tenderly Configuration */}
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="form-row">
          <FormField
            label="Account Slug"
            placeholder="Enter your account slug"
            value={formData.accountSlug}
            onChange={(value) => handleInputChange('accountSlug', value)}
            autoComplete="username"
            name="tenderly-account-slug"
            required={true}
          />
          
          <FormField
            label="Project Slug"
            placeholder="Enter your project slug"
            value={formData.projectSlug}
            onChange={(value) => handleInputChange('projectSlug', value)}
            required={true}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <FormField
              label="Tenderly API Key"
              type="password"
              placeholder="Enter your API key"
              value={formData.tenderlyApiKey}
              onChange={(value) => handleInputChange('tenderlyApiKey', value)}
              autoComplete="current-password"
              name="tenderly-api-key"
              required={true}
            />
          <div className="api-key-info">
            <span>ℹ️</span>
            <span>You will need a Tenderly API key to use this service.</span>
            <a 
              href="https://dashboard.tenderly.co/account/authorization" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="api-key-link"
            >
              Get API Key →
            </a>
          </div>
        </div>
      </div>

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
          onClick={simulateTransaction}
        >
          Simulate Transaction
        </LoadingButton>
      </div>
      </form>

      {simulationResult && !simulationResult.foundryCommand && (
        <SimulationSuccessCard
          accountSlug={formData.accountSlug}
          projectSlug={formData.projectSlug}
          simulationResult={simulationResult}
        />
      )}
    </div>
  );
};

export default SimulateTenderly;
