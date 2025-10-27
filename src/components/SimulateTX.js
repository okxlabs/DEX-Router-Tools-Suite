import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Reusable Form Field Component
const FormField = ({ label, type = "text", placeholder, value, onChange, options = null }) => (
  <div className="form-group">
    <label className="form-label">
      {label}
    </label>
    {options ? (
      <select
        className="foundry-input-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          backgroundSize: '16px',
          paddingRight: '40px',
          cursor: 'pointer'
        }}
      >
        <option value="">{placeholder}</option>
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
      />
    )}
  </div>
);

// Success Card Component
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

const SimulateTX = ({ showToast }) => {
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    calldata: '',
    chainId: '',
    msgValue: '',
    gas: '',
    accountSlug: '',
    projectSlug: '',
    tenderlyApiKey: '',
    blockHeight: ''
  });

  // Load saved credentials from localStorage on component mount
  useEffect(() => {
    const savedAccountSlug = localStorage.getItem('tenderly_account_slug');
    const savedProjectSlug = localStorage.getItem('tenderly_project_slug');
    const savedApiKey = localStorage.getItem('tenderly_api_key');

    if (savedAccountSlug || savedProjectSlug || savedApiKey) {
      setFormData(prev => ({
        ...prev,
        accountSlug: savedAccountSlug || '',
        projectSlug: savedProjectSlug || '',
        tenderlyApiKey: savedApiKey || ''
      }));
    }
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Save Tenderly credentials to localStorage
    if (field === 'accountSlug') {
      localStorage.setItem('tenderly_account_slug', value);
    } else if (field === 'projectSlug') {
      localStorage.setItem('tenderly_project_slug', value);
    } else if (field === 'tenderlyApiKey') {
      localStorage.setItem('tenderly_api_key', value);
    }
  };

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  const chainOptions = [
    { id: '1', name: 'Ethereum Mainnet'},
    { id: '56', name: 'BSC'},
    { id: '8453', name: 'Base'},
    { id: '42161', name: 'Arbitrum One'},
    { id: '43114', name: 'Avalanche'}
  ];


  const simulateTransaction = async () => {
    // Validate required fields
    if (!formData.accountSlug || !formData.projectSlug || !formData.tenderlyApiKey) {
      showToast('Please fill in Account Slug, Project Slug, and Tenderly API Key', 'error');
      return;
    }

    if (!formData.from || !formData.to || !formData.calldata || !formData.chainId) {
      showToast('Please fill in all transaction fields (From, To, Calldata, Chain ID)', 'error');
      return;
    }

    setIsSimulating(true);
    setSimulationResult(null);

    try {
      // Build simulation payload following the exact sample format
      const simulationPayload = {
        'network_id': formData.chainId,
        'from': formData.from,
        'to': formData.to,
        'input': formData.calldata,
        'gas': formData.gas ? parseInt(formData.gas) : 100000000, // Use provided gas or default
        'value': formData.msgValue ? (parseFloat(formData.msgValue) * 1e18).toString() : '0', // Convert ETH to wei
        'save': true,
        'save_if_fails': true,
        'simulation_type': 'full'
      };

      // Add block number if specified
      if (formData.blockHeight && formData.blockHeight !== 'latest' && formData.blockHeight !== '') {
        simulationPayload.block_number = parseInt(formData.blockHeight);
      }

      // Use axios exactly as in the sample
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

      setSimulationResult(response.data);
      showToast('Transaction simulation completed successfully! Click the link below to view in Tenderly.', 'success');

    } catch (error) {
      console.error('Simulation error:', error);
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Unknown error occurred';
      showToast(`Simulation failed: ${errorMessage}`, 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="component-container">
      <div className="foundry-form-section">
        {/* Transaction Details */}
        <div className="form-row">
          <FormField
            label="From Address"
            type="text"
            placeholder="0x..."
            value={formData.from}
            onChange={(value) => handleInputChange('from', value)}
          />
          
          <FormField
            label="To Address"
            type="text"
            placeholder="0x..."
            value={formData.to}
            onChange={(value) => handleInputChange('to', value)}
          />
        </div>

        {/* Network Configuration */}
        <div className="form-row">
          <FormField
            label="Blockchain Network"
            placeholder="Select a blockchain network..."
            value={formData.chainId}
            onChange={(value) => handleInputChange('chainId', value)}
            options={chainOptions}
          />
          
          <FormField
            label="Block Height"
            placeholder="latest"
            value={formData.blockHeight}
            onChange={(value) => handleInputChange('blockHeight', value)}
          />
        </div>

        {/* Transaction Parameters */}
        <div className="form-row">
          <FormField
            label="msg.value (ETH)"
            placeholder="0 (optional)"
            value={formData.msgValue}
            onChange={(value) => handleInputChange('msgValue', value)}
          />
          
          <FormField
            label="Gas Limit"
            placeholder="100000000 (optional)"
            value={formData.gas}
            onChange={(value) => handleInputChange('gas', value)}
          />
        </div>

        {/* Tenderly Configuration */}
        <div className="form-row">
          <FormField
            label="Account Slug"
            placeholder="your-account-slug"
            value={formData.accountSlug}
            onChange={(value) => handleInputChange('accountSlug', value)}
          />
          
          <FormField
            label="Project Slug"
            placeholder="your-project-slug"
            value={formData.projectSlug}
            onChange={(value) => handleInputChange('projectSlug', value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <FormField
              label="Tenderly API Key"
              type="password"
              placeholder="your-api-key"
              value={formData.tenderlyApiKey}
              onChange={(value) => handleInputChange('tenderlyApiKey', value)}
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

        {/* Calldata */}
        <FormField
          label="Calldata"
          placeholder="0x..."
          value={formData.calldata}
          onChange={(value) => handleInputChange('calldata', value)}
        />

        {/* Submit Button */}
        <div className="form-group submit-section">
          <button
            onClick={simulateTransaction}
            disabled={isSimulating}
            className={`component-button ${isSimulating ? 'loading' : 'success'}`}
          >
            {isSimulating ? 'Simulating...' : 'Simulate Transaction'}
          </button>
        </div>

        {/* Success Result */}
        {simulationResult && (
          <SimulationSuccessCard
            accountSlug={formData.accountSlug}
            projectSlug={formData.projectSlug}
            simulationResult={simulationResult}
          />
        )}
      </div>
    </div>
  );
};

export default SimulateTX;