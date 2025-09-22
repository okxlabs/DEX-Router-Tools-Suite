import React, { useState } from 'react';
import './TxSimulation.css';

const TxSimulation = ({ 
  onButtonClick, 
  result, 
  showToast 
}) => {
  const [transactionData, setTransactionData] = useState('');
  const [chain, setChain] = useState('');
  const [rpcUrl, setRpcUrl] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [value, setValue] = useState('');
  const [blockHeight, setBlockHeight] = useState('');

  return (
    <div className="component-container">
      <h2 className="component-title tx-simulation-title">TX simulation</h2>
      
      <div className="simulation-form">
        <textarea
          value={transactionData}
          onChange={(e) => setTransactionData(e.target.value)}
          placeholder="Enter transaction data for simulation..."
          className="component-textarea"
        />
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Chain:</label>
            <select 
              value={chain} 
              onChange={(e) => setChain(e.target.value)}
              className="form-select"
            >
              <option value="">Select Chain</option>
              <option value="ethereum">Ethereum</option>
              <option value="xlayer">X Layer</option>
              <option value="bsc">BNB Smart Chain</option>
              <option value="other">Others (Input RPC URL directly)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">RPC URL:</label>
            <input
              type="text"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              placeholder="Enter custom RPC URL (optional)"
              className="form-input"
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">From Address:</label>
            <input
              type="text"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              placeholder="0x..."
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">To Address:</label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              className="form-input"
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Value:</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder=""
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Block Height:</label>
            <input
              type="text"
              value={blockHeight}
              onChange={(e) => setBlockHeight(e.target.value)}
              placeholder="Enter block number (optional)"
              className="form-input"
            />
          </div>
        </div>
        
        <button
          onClick={() => onButtonClick({
            transactionData,
            chain,
            rpcUrl,
            fromAddress,
            toAddress,
            value,
            blockHeight
          })}
          className="component-button"
        >
          Simulate
        </button>
      </div>
      
      {/* Display results */}
      {result && (
        <div className="result-container">
          {/* Clipboard icon in top-right corner */}
          <div
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(result, null, 2)).then(() => {
                showToast('TX simulation result copied to clipboard!', 'success');
              }).catch(() => {
                showToast('Failed to copy simulation result', 'error');
              });
            }}
            className="clipboard-icon"
            title="Copy simulation result to clipboard"
          >
            📋
          </div>
          <pre className="result-content">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TxSimulation;
