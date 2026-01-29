import React, { useState, useEffect, useRef } from 'react';
import './Utilities.css';
import { findBlockByTimestamp } from '../scripts/utilities/findBlock';

// Predefined chain RPC URLs (CORS-enabled public endpoints)
const CHAIN_OPTIONS = [
  { id: 'eth', name: 'Ethereum', rpcUrl: 'https://eth.drpc.org' },
  { id: 'bsc', name: 'BSC', rpcUrl: 'https://bsc-dataseed.binance.org' },
  { id: 'arb', name: 'Arbitrum', rpcUrl: 'https://arb1.arbitrum.io/rpc' },
  { id: 'base', name: 'Base', rpcUrl: 'https://base.drpc.org' },
  { id: 'xlayer', name: 'X Layer', rpcUrl: 'https://xlayer.drpc.org' },
  { id: 'custom', name: 'Custom RPC', rpcUrl: '' },
];

const Utilities = ({ showToast }) => {
  // Chain selection state
  const [selectedChain, setSelectedChain] = useState('eth');
  const [rpcUrl, setRpcUrl] = useState(CHAIN_OPTIONS[0].rpcUrl);
  
  // Timestamp input state
  const [timestampInput, setTimestampInput] = useState('');
  
  // Block finder state
  const [isSearching, setIsSearching] = useState(false);
  const [blockResult, setBlockResult] = useState(null);
  const [searchError, setSearchError] = useState(null);
  
  // Ref for debounce timer
  const debounceTimer = useRef(null);

  // Handle chain selection change
  const handleChainChange = (chainId) => {
    setSelectedChain(chainId);
    const chain = CHAIN_OPTIONS.find(c => c.id === chainId);
    if (chain) {
      setRpcUrl(chain.rpcUrl);
    }
  };

  // Handle RPC URL change - switch to Custom if URL doesn't match any predefined chain
  const handleRpcUrlChange = (e) => {
    const newUrl = e.target.value;
    setRpcUrl(newUrl);
    
    // Check if the new URL matches any predefined chain
    const matchingChain = CHAIN_OPTIONS.find(c => c.id !== 'custom' && c.rpcUrl === newUrl);
    if (matchingChain) {
      setSelectedChain(matchingChain.id);
    } else {
      setSelectedChain('custom');
    }
  };

  // Parse input - accepts timestamp or date format (YYYY-MM-DD HH:mm)
  const parseTimeInput = (input) => {
    if (!input || input.trim() === '') return null;
    
    const trimmed = input.trim();
    
    // Check if it's a pure number (timestamp)
    if (/^\d+$/.test(trimmed)) {
      let ts = parseInt(trimmed);
      // Handle millisecond timestamps
      if (ts > 10000000000) {
        ts = Math.floor(ts / 1000);
      }
      return ts;
    }
    
    // Try to parse as date format: YYYY-MM-DD HH:mm or YYYY-MM-DD (treated as UTC+8)
    const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
    if (dateMatch) {
      const [, year, month, day, hour = '00', minute = '00'] = dateMatch;
      // Create date string and parse as UTC+8
      const dateStr = `${year}-${month}-${day}T${hour}:${minute}:00+08:00`;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000);
      }
    }
    
    return null;
  };

  // Auto-execute block finder when inputs change
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    const timestamp = parseTimeInput(timestampInput);
    
    // Only search if we have valid inputs
    if (timestamp === null || !rpcUrl) {
      setBlockResult(null);
      setSearchError(null);
      return;
    }
    
    // Debounce the search (wait 800ms after user stops typing)
    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      setBlockResult(null);
      setSearchError(null);
      
      try {
        const result = await findBlockByTimestamp(rpcUrl, timestamp);
        setBlockResult(result);
      } catch (error) {
        // Provide user-friendly error messages
        let errorMsg = error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMsg = 'Network error: Unable to connect to RPC. The endpoint may not support CORS or is unreachable.';
        } else if (error.message.includes('HTTP error')) {
          errorMsg = `RPC error: ${error.message}`;
        }
        setSearchError(errorMsg);
      } finally {
        setIsSearching(false);
      }
    }, 800);
    
    // Cleanup on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [timestampInput, rpcUrl]);

  // Get the effective timestamp
  const getEffectiveTimestamp = () => {
    return parseTimeInput(timestampInput);
  };

  // Handle input change - allow any text input
  const handleTimestampChange = (e) => {
    setTimestampInput(e.target.value);
  };

  // Display the current effective timestamp
  const displayTimestamp = () => {
    const ts = getEffectiveTimestamp();
    if (ts === null) return 'Invalid or no input';
    const date = new Date(ts * 1000);
    return `${ts} (${date.toUTCString()})`;
  };

  return (
    <div className="utilities-container">
      <div className="utility-section">
        {/* Chain Selection and RPC URL Row */}
        <div className="chain-rpc-row">
          <div className="form-group chain-select-group">
            <label className="form-label">
              Chain
            </label>
            <select
              className="foundry-input-white"
              value={selectedChain}
              onChange={(e) => handleChainChange(e.target.value)}
            >
              {CHAIN_OPTIONS.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group rpc-url-group">
            <label className="form-label">
              RPC URL
            </label>
            <input
              type="text"
              className="foundry-input-white"
              value={rpcUrl}
              onChange={handleRpcUrlChange}
              placeholder="https://your-rpc-endpoint.com"
            />
          </div>
        </div>

        {/* Timestamp / Date Input */}
        <div className="form-group">
          <label className="form-label">
            Timestamp or Date (UTC+8)
          </label>
          <input
            type="text"
            className="foundry-input-white"
            value={timestampInput}
            onChange={handleTimestampChange}
            placeholder="1704067200 or 2025-12-01 23:59"
          />
        </div>

        {/* Display effective timestamp */}
        <div className="timestamp-preview">
          <span className="preview-label">Effective Timestamp:</span>
          <span className="preview-value">{displayTimestamp()}</span>
        </div>

        {/* Loading indicator */}
        {isSearching && (
          <div className="search-loading">
            Searching for block...
          </div>
        )}

        {/* Block Result */}
        {blockResult && (
          <div className="block-result">
            <div className="result-row">
              <span className="result-label">Block Number:</span>
              <span className="result-value">{blockResult.blockNumber}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Block Hash:</span>
              <span className="result-value hash">{blockResult.blockHash}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Block Timestamp:</span>
              <span className="result-value">{blockResult.timestamp} ({new Date(blockResult.timestamp * 1000).toUTCString()})</span>
            </div>
            <div className="result-row">
              <span className="result-label">Search Iterations:</span>
              <span className="result-value">{blockResult.iterations}</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {searchError && (
          <div className="search-error">
            {searchError}
          </div>
        )}
      </div>
    </div>
  );
};

export default Utilities;
