import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingButton from './ui/LoadingButton';
import ResultDisplay from './ui/ResultDisplay';
import { chainOptions, rpcUrlOptions } from '../utils/networkConfig';

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

const SimulateTX = ({ 
  simulationState,
  updateSimulationFormData,
  updateSimulationStatus,
  showToast 
}) => {
  const { formData, isSimulating, simulationResult } = simulationState;
  
  // Initialize activeTab from localStorage or default to 'tenderly'
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('simulation_active_tab') || 'tenderly';
  });

  useEffect(() => {
    const savedProjectSlug = localStorage.getItem('tenderly_project_slug');

    if (savedProjectSlug && !formData.projectSlug) {
      updateSimulationFormData('projectSlug', savedProjectSlug);
    }
  }, [formData.projectSlug, updateSimulationFormData]);

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('simulation_active_tab', tab);
  };

  const handleInputChange = (field, value) => {
    updateSimulationFormData(field, value);

    if (field === 'chainId') {
      if (value === 'other') {
        updateSimulationFormData('customChainId', '');
      } else {
        updateSimulationFormData('customChainId', value);
      }
    }

    if (field === 'customChainId') {
      const matchingNetwork = chainOptions.find(option => option.id === value && option.id !== 'other');
      
      if (matchingNetwork) {
        updateSimulationFormData('chainId', matchingNetwork.id);
      } else {
        updateSimulationFormData('chainId', 'other');
      }
    }

    if (field === 'rpcUrlPreset') {
      if (value === 'custom') {
        updateSimulationFormData('rpcUrl', '');
      } else {
        const selectedRpc = rpcUrlOptions.find(option => option.id === value);
        if (selectedRpc) {
          updateSimulationFormData('rpcUrl', selectedRpc.url);
        }
      }
    }

    if (field === 'rpcUrl') {
      const matchingRpc = rpcUrlOptions.find(option => option.url === value && option.id !== 'custom');
      
      if (matchingRpc) {
        updateSimulationFormData('rpcUrlPreset', matchingRpc.id);
      } else {
        updateSimulationFormData('rpcUrlPreset', 'custom');
      }
    }

    if (field === 'projectSlug') {
      localStorage.setItem('tenderly_project_slug', value);
    }
  };

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

  const renderFoundryTab = () => (
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

  const renderTenderlyTab = () => (
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

        {simulationResult && (
          <SimulationSuccessCard
            accountSlug={formData.accountSlug}
            projectSlug={formData.projectSlug}
            simulationResult={simulationResult}
          />
        )}
    </div>
  );

  return (
    <div>
      {/* Tab Navigation */}
      <div className="simulation-tab-navigation">
        <button
          className={`simulation-tab-button ${activeTab === 'foundry' ? 'active' : ''}`}
          onClick={() => handleTabChange('foundry')}
        >
          Foundry
        </button>
        <button
          className={`simulation-tab-button ${activeTab === 'tenderly' ? 'active' : ''}`}
          onClick={() => handleTabChange('tenderly')}
        >
          Tenderly
        </button>
      </div>

      {/* Tab Content */}
      <div className="simulation-tab-content">
        {activeTab === 'foundry' && renderFoundryTab()}
        {activeTab === 'tenderly' && renderTenderlyTab()}
      </div>
    </div>
  );
};

export default SimulateTX;