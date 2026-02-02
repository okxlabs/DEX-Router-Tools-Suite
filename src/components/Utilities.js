import React, { useState, useEffect } from 'react';
import './Utilities.css';
import { findBlockByTimestamp } from '../scripts/utilities/findBlock';
import { toChecksumAddress, isValidAddress } from '../scripts/utilities/addressChecksum';
import { getEventTopic0 } from '../scripts/utilities/topic0Calculator';

// Custom hook for debounced value - only updates after user stops typing
const useDebouncedValue = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

// Predefined chain RPC URLs (CORS-enabled public endpoints)
const CHAIN_OPTIONS = [
  { id: 'custom', name: 'Custom RPC', rpcUrl: '' },
  { id: 'eth', name: 'Ethereum Mainnet', rpcUrl: 'https://eth.drpc.org' },
  { id: 'bsc', name: 'BSC', rpcUrl: 'https://bsc-dataseed.binance.org' },
  { id: 'base', name: 'Base', rpcUrl: 'https://base.drpc.org' },
  { id: 'arb', name: 'Arbitrum One', rpcUrl: 'https://arb1.arbitrum.io/rpc' },
  { id: 'xlayer', name: 'X Layer', rpcUrl: 'https://xlayer.drpc.org' },
  { id: 'op', name: 'Optimism', rpcUrl: 'https://mainnet.optimism.io' },
  { id: 'mode', name: 'Mode', rpcUrl: 'https://mainnet.mode.network' },
];

const Utilities = ({ showToast, initialTimestamp, onInitialTimestampConsumed }) => {
  // Chain selection state - default to Ethereum
  const [selectedChain, setSelectedChain] = useState('eth');
  const [rpcUrl, setRpcUrl] = useState(CHAIN_OPTIONS.find(c => c.id === 'eth').rpcUrl);
  
  // Timestamp input state
  const [timestampInput, setTimestampInput] = useState('');
  
  // Debounced timestamp input - only triggers block search after 1500ms idle
  const debouncedTimestampInput = useDebouncedValue(timestampInput, 1500);

  // Handle initial timestamp from props (e.g., from Find Height button)
  useEffect(() => {
    if (initialTimestamp) {
      setTimestampInput(initialTimestamp);
      // Clear the initial timestamp after consuming it
      if (onInitialTimestampConsumed) {
        onInitialTimestampConsumed();
      }
    }
  }, [initialTimestamp, onInitialTimestampConsumed]);
  
  // Block finder state
  const [blockResult, setBlockResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Address checksum state
  const [addressInput, setAddressInput] = useState('');
  const [checksumResult, setChecksumResult] = useState(null);
  const [addressError, setAddressError] = useState(null);

  // Topic0 calculator state
  const [eventInput, setEventInput] = useState('');
  const [topic0Result, setTopic0Result] = useState(null);
  const [topic0Error, setTopic0Error] = useState(null);

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

  // Parse input - accepts timestamp or date format (YYYY-MM-DD HH:mm:ss)
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
    
    // Try to parse as date format: YYYY-M-D HH:mm:ss or YYYY-MM-DD HH:mm or YYYY-M-D (treated as UTC+8)
    // Accepts single or double digit month/day/hour/minute/second
    const dateMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (dateMatch) {
      const [, year, month, day, hour = '00', minute = '00', second = '00'] = dateMatch;
      // Pad with leading zeros for proper date parsing
      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      const paddedHour = hour.padStart(2, '0');
      const paddedMinute = minute.padStart(2, '0');
      const paddedSecond = second.padStart(2, '0');
      // Create date string and parse as UTC+8
      const dateStr = `${year}-${paddedMonth}-${paddedDay}T${paddedHour}:${paddedMinute}:${paddedSecond}+08:00`;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000);
      }
    }
    
    return null;
  };

  // Auto-execute block finder when debounced inputs change
  useEffect(() => {
    const timestamp = parseTimeInput(debouncedTimestampInput);
    
    // Only search if we have valid inputs
    if (timestamp === null || !rpcUrl) {
      setBlockResult(null);
      setSearchError(null);
      return;
    }
    
    // Perform the search (debouncing is already handled by useDebouncedValue)
    const performSearch = async () => {
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
      }
    };
    
    performSearch();
  }, [debouncedTimestampInput, rpcUrl]);

  // Get the effective timestamp
  const getEffectiveTimestamp = () => {
    return parseTimeInput(timestampInput);
  };

  // Handle input change - allow any text input
  const handleTimestampChange = (e) => {
    setTimestampInput(e.target.value);
  };

  // Check if input is a date format (vs timestamp)
  const isDateFormat = (input) => {
    if (!input || input.trim() === '') return false;
    const trimmed = input.trim();
    // If it's a pure number, it's a timestamp
    if (/^\d+$/.test(trimmed)) return false;
    // Check if it matches date format
    return /^\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)?$/.test(trimmed);
  };

  // Convert timestamp to date string in UTC+8 format
  const timestampToDateString = (ts) => {
    // Create date and adjust to UTC+8
    const date = new Date(ts * 1000);
    const utc8Offset = 8 * 60 * 60 * 1000;
    const utc8Date = new Date(date.getTime() + utc8Offset);
    
    const year = utc8Date.getUTCFullYear();
    const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utc8Date.getUTCDate()).padStart(2, '0');
    const hour = String(utc8Date.getUTCHours()).padStart(2, '0');
    const minute = String(utc8Date.getUTCMinutes()).padStart(2, '0');
    const second = String(utc8Date.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };

  // Adjust timestamp by hours, preserving input format
  const adjustTimestamp = (hours) => {
    const currentTs = parseTimeInput(timestampInput);
    if (currentTs !== null) {
      const newTs = currentTs + (hours * 3600);
      // Preserve original format
      if (isDateFormat(timestampInput)) {
        setTimestampInput(timestampToDateString(newTs));
      } else {
        setTimestampInput(newTs.toString());
      }
    }
  };

  // Display the current effective timestamp
  const displayTimestamp = () => {
    const ts = getEffectiveTimestamp();
    if (ts === null) return 'Invalid or no input';
    const date = new Date(ts * 1000);
    return `${ts} (${date.toUTCString()})`;
  };

  // Handle address input change - auto checksum
  const handleAddressChange = (e) => {
    const value = e.target.value;
    setAddressInput(value);
    
    if (!value.trim()) {
      setChecksumResult(null);
      setAddressError(null);
      return;
    }

    if (!isValidAddress(value)) {
      setChecksumResult(null);
      setAddressError('Invalid address format');
      return;
    }

    try {
      const checksummed = toChecksumAddress(value);
      setChecksumResult(checksummed);
      setAddressError(null);
    } catch (error) {
      setChecksumResult(null);
      setAddressError(error.message);
    }
  };

  // Copy block number to clipboard
  const copyBlockNumber = () => {
    if (blockResult) {
      navigator.clipboard.writeText(blockResult.blockNumber.toString());
      showToast('Block number copied!', 'success');
    }
  };

  // Copy checksum result to clipboard
  const copyChecksumToClipboard = () => {
    if (checksumResult) {
      navigator.clipboard.writeText(checksumResult);
      showToast('Checksum address copied!', 'success');
    }
  };

  // Handle event input change - auto calculate topic0
  const handleEventInputChange = (e) => {
    const value = e.target.value;
    setEventInput(value);
    
    if (!value.trim()) {
      setTopic0Result(null);
      setTopic0Error(null);
      return;
    }

    try {
      const result = getEventTopic0(value);
      setTopic0Result(result);
      setTopic0Error(null);
    } catch (error) {
      setTopic0Result(null);
      setTopic0Error(error.message);
    }
  };

  // Copy topic0 to clipboard
  const copyTopic0ToClipboard = () => {
    if (topic0Result) {
      navigator.clipboard.writeText(topic0Result.topic0);
      showToast('Topic0 copied!', 'success');
    }
  };

  return (
    <div className="utilities-container">
      <div className="utility-section">
        <h3 className="section-title">Block Finder</h3>
        
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
          <div className="timestamp-input-row">
            <input
              type="text"
              className="foundry-input-white timestamp-input"
              value={timestampInput}
              onChange={handleTimestampChange}
              placeholder="1704067200 or 2025-12-01 23:59:59"
            />
            <button 
              className="hour-adjust-btn"
              onClick={() => adjustTimestamp(1)}
              title="Add 1 hour"
            >
              +1 Hr
            </button>
            <button 
              className="hour-adjust-btn"
              onClick={() => adjustTimestamp(-1)}
              title="Subtract 1 hour"
            >
              -1 Hr
            </button>
          </div>
        </div>

        {/* Display effective timestamp */}
        <div className="timestamp-preview">
          <span className="preview-label">Effective Timestamp:</span>
          <span className="preview-value">{displayTimestamp()}</span>
        </div>

        {/* Block Result */}
        {blockResult && (
          <div className="block-result" onClick={copyBlockNumber}>
            <div className="result-row">
              <span className="result-label">Chain:</span>
              <span className="result-value">{selectedChain === 'custom' ? 'Custom' : CHAIN_OPTIONS.find(c => c.id === selectedChain)?.name || 'Custom'}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Block Number:</span>
              <span className="result-value">{blockResult.blockNumber}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Block Timestamp:</span>
              <span className="result-value">{blockResult.timestamp} ({new Date(blockResult.timestamp * 1000).toUTCString()})</span>
            </div>
            <span className="copy-hint">Click to copy block number</span>
          </div>
        )}

        {/* Error Display */}
        {searchError && (
          <div className="search-error">
            {searchError}
          </div>
        )}
      </div>

      {/* Address Checksum Section */}
      <div className="utility-section">
        <h3 className="section-title">Address Checksum</h3>
        
        <div className="form-group">
          <label className="form-label">
            Ethereum Address
          </label>
          <input
            type="text"
            className="foundry-input-white"
            value={addressInput}
            onChange={handleAddressChange}
            placeholder="0x..."
          />
        </div>

        {/* Checksum Result */}
        {checksumResult && (
          <div className="checksum-result" onClick={copyChecksumToClipboard}>
            <span className="result-label">Checksummed Address:</span>
            <span className="result-value">{checksumResult}</span>
            <span className="copy-hint">Click to copy</span>
          </div>
        )}

        {/* Address Error */}
        {addressError && (
          <div className="search-error">
            {addressError}
          </div>
        )}
      </div>

      {/* Topic0 Calculator Section */}
      <div className="utility-section">
        <h3 className="section-title">Topic0 Calculator</h3>
        
        <div className="form-group">
          <label className="form-label">
            Event Signature
          </label>
          <input
            type="text"
            className="foundry-input-white"
            value={eventInput}
            onChange={handleEventInputChange}
            placeholder="Paste full event - variable names will be auto-removed"
          />
        </div>

        {/* Topic0 Result */}
        {topic0Result && (
          <div className="topic0-result" onClick={copyTopic0ToClipboard}>
            <div className="result-row">
              <span className="result-label">Normalized Signature:</span>
              <span className="result-value">{topic0Result.signature}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Topic0:</span>
              <span className="result-value">{topic0Result.topic0}</span>
            </div>
            <span className="copy-hint">Click to copy topic0</span>
          </div>
        )}

        {/* Topic0 Error */}
        {topic0Error && (
          <div className="search-error">
            {topic0Error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Utilities;
