import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HelpTooltip from './HelpTooltip';

const SimulateTX = ({ showToast }) => {
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    calldata: '',
    chainId: '',
    customChainId: '',
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
    // { id: '137', name: 'Polygon'},
    // { id: '10', name: 'Optimism'},
    { id: '43114', name: 'Avalanche'},
    // { id: '250', name: 'Fantom'},
    // { id: '100', name: 'Gnosis'},
    // { id: '534352', name: 'Scroll'},
    // { id: '5000', name: 'Mantle'},
    // { id: '1101', name: 'Polygon zkEVM'},
    // { id: '81457', name: 'Blast'},
    // { id: '25', name: 'Cronos'},
    // { id: '324', name: 'zkSync Era'}
  ];

  const getChainName = (chainId) => {
    const chain = chainOptions.find(chain => chain.id === chainId);
    return chain ? chain.name : `Chain ${chainId}`;
  };

  const simulateTransaction = async () => {
    // Validate required fields
    if (!formData.accountSlug || !formData.projectSlug || !formData.tenderlyApiKey) {
      showToast('Please fill in Account Slug, Project Slug, and Tenderly API Key', 'error');
      return;
    }

    // Get the actual chain ID to use
    const actualChainId = formData.chainId === 'other' ? formData.customChainId : formData.chainId;
    
    if (!formData.from || !formData.to || !formData.calldata || !actualChainId) {
      showToast('Please fill in all transaction fields (From, To, Calldata, Chain ID)', 'error');
      return;
    }

    if (formData.chainId === 'other' && !formData.customChainId) {
      showToast('Please enter a custom chain ID', 'error');
      return;
    }

    setIsSimulating(true);
    setSimulationResult(null);

    try {
      // Build simulation payload following the exact sample format
      const simulationPayload = {
        'network_id': actualChainId,
        'from': formData.from,
        'to': formData.to,
        'input': formData.calldata,
        'gas': formData.gas ? parseInt(formData.gas) : 648318, // Use provided gas or default
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
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              From Address
              <HelpTooltip content="The sender address for the transaction" />
            </label>
            <input
              type="text"
              className="foundry-input-white"
              placeholder="0x..."
              value={formData.from}
              onChange={(e) => handleInputChange('from', e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              To Address
              <HelpTooltip content="The recipient address for the transaction (contract or EOA)" />
            </label>
            <input
              type="text"
              className="foundry-input-white"
              placeholder="0x..."
              value={formData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Blockchain Network
              <HelpTooltip content="Select the blockchain network for your transaction simulation" />
            </label>
            <select
              className="foundry-input-white"
              value={formData.chainId}
              onChange={(e) => handleInputChange('chainId', e.target.value)}
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
              <option value="">Select a blockchain network...</option>
              {chainOptions.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
              <option value="other">Other (Custom Chain ID)</option>
            </select>
            
            {formData.chainId === 'other' && (
              <div style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  className="foundry-input-white"
                  placeholder="Enter chain ID"
                  value={formData.customChainId}
                  onChange={(e) => handleInputChange('customChainId', e.target.value)}
                  style={{
                    fontSize: '14px',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                  }}
                />
                <div style={{ 
                  fontSize: '11px', 
                  color: '#6c757d', 
                  marginTop: '4px'
                }}>
                  💡 Tip: You can find chain IDs at <a href="https://chainlist.org" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>chainlist.org</a>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              msg.value (ETH)
              <HelpTooltip content="The amount of ETH to send with the transaction (optional)" />
            </label>
            <input
              type="text"
              className="foundry-input-white"
              placeholder="0 (optional)"
              value={formData.msgValue}
              onChange={(e) => handleInputChange('msgValue', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Gas Limit
              <HelpTooltip content="Maximum gas units the transaction can consume" />
            </label>
            <input
              type="text"
              className="foundry-input-white"
              placeholder="648318 (or leave empty for auto)"
              value={formData.gas}
              onChange={(e) => handleInputChange('gas', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Block Height
              <HelpTooltip content="The block number to simulate the transaction at (optional, defaults to latest)" />
            </label>
            <input
              type="text"
              className="foundry-input-white"
              placeholder="latest (or specific block number)"
              value={formData.blockHeight}
              onChange={(e) => handleInputChange('blockHeight', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Account Slug
              <HelpTooltip content="Your Tenderly account slug (username or organization name) - automatically saved in browser" />
            </label>
            <input
              type="text"
              className="foundry-input-white"
              placeholder="your-account-slug"
              value={formData.accountSlug}
              onChange={(e) => handleInputChange('accountSlug', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Project Slug
              <HelpTooltip content="Your Tenderly project slug - automatically saved in browser" />
            </label>
            <input
              type="text"
              className="foundry-input-white"
              placeholder="your-project-slug"
              value={formData.projectSlug}
              onChange={(e) => handleInputChange('projectSlug', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Tenderly API Key
              <HelpTooltip content="Your Tenderly API key for authentication (automatically saved in browser)" />
            </label>
            <input
              type="password"
              className="foundry-input-white"
              placeholder="your-api-key"
              value={formData.tenderlyApiKey}
              onChange={(e) => handleInputChange('tenderlyApiKey', e.target.value)}
            />
            <div style={{ 
              fontSize: '12px', 
              color: '#6c757d', 
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>ℹ️</span>
              <span>You will need a Tenderly API key to use this service.</span>
              <a 
                href="https://dashboard.tenderly.co/account/authorization" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: '#007bff', textDecoration: 'none' }}
                onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
              >
                Get API Key →
              </a>
            </div>
          </div>
        </div>


        <div className="form-group">
          <label className="form-label">
            Calldata
            <HelpTooltip content="Hex-encoded calldata for the contract function call" />
          </label>
          <input
            type="text"
            className="foundry-input-white"
            placeholder="0x... (function selector + encoded parameters)"
            value={formData.calldata}
            onChange={(e) => handleInputChange('calldata', e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <button
            onClick={simulateTransaction}
            disabled={isSimulating}
            className="foundry-button"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: isSimulating ? '#666' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {isSimulating ? 'Simulating...' : 'Simulate Transaction'}
          </button>
        </div>

        {simulationResult && (
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label className="form-label">🎉 Simulation Complete!</label>
            
            {/* Beautiful Tenderly Link Card */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '20px',
              color: 'white',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                  borderRadius: '50%', 
                  width: '40px', 
                  height: '40px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: '15px',
                  fontSize: '20px'
                }}>
                  🔍
                </div>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                    View in Tenderly Dashboard
                  </h3>
                  <p style={{ margin: '0', fontSize: '14px', opacity: '0.9' }}>
                    Analyze your transaction simulation with detailed traces and logs
                  </p>
                </div>
              </div>
              
              <a
                href={`https://dashboard.tenderly.co/${formData.accountSlug}/${formData.projectSlug}/simulator/${simulationResult.simulation?.id || simulationResult.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                🚀 Open Tenderly Simulation →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulateTX;