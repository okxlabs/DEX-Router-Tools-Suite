import './App.css';
import { useState } from 'react';
import { resolve } from './scripts/decode/decode_index.js';
import { encode } from './scripts/encode/encode_index.js';
import { validateEncodedCalldata, validateDecodedJson } from './scripts/core/roundtrip_validator.js';
import { createDecodeOperation, createEncodeOperation, formatJSON } from './scripts/componentUtils.js';
import DecodeCalldata from './components/forms/DecodeCalldata';
import EncodeCalldata from './components/forms/EncodeCalldata';
import SimulateTX from './components/SimulateTX';
import Utilities from './components/Utilities';

function App() {
  const [activeTab, setActiveTab] = useState('decode');
  const [leftInput, setLeftInput] = useState('');
  const [rightInput, setRightInput] = useState('');
  const [decodeResult, setDecodeResult] = useState(null);
  const [encodeResult, setEncodeResult] = useState(null);
  const [decodeValidation, setDecodeValidation] = useState(null);
  const [encodeValidation, setEncodeValidation] = useState(null);
  const [toast, setToast] = useState(null);

  // TX Simulation state - lifted up to preserve content when switching tabs
  const [simulationState, setSimulationState] = useState({
    formData: {
      from: '',
      to: '',
      calldata: '',
      chainId: 'other',
      customChainId: '',
      msgValue: '',
      accountSlug: '',
      projectSlug: '',
      tenderlyApiKey: '',
      blockHeight: ''
    },
    isSimulating: false,
    simulationResult: null
  });

  // Utilities initial timestamp - for Find Height feature
  const [utilitiesInitialTimestamp, setUtilitiesInitialTimestamp] = useState(null);

  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  // Helper functions to update simulation state
  const updateSimulationFormData = (field, value) => {
    setSimulationState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value
      }
    }));
  };

  const updateSimulationStatus = (field, value) => {
    setSimulationState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditFromDecode = (decodedResult) => {
    // Navigate to encode tab and populate with decoded JSON
    setActiveTab('encode');
    setRightInput(formatJSON(decodedResult));
    showToast('Switched to Encode tab with decoded result!', 'success');
  };

  // Helper function to find timestamp/deadline in decoded result
  const findTimestampInResult = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    
    // Common timestamp field names in DEX router calldata (note: deadLine has capital L)
    const timestampFields = ['deadLine', 'deadline', 'expiryTime', 'timestamp', 'expiry', 'validBefore'];
    
    // Check direct properties first
    for (const field of timestampFields) {
      if (obj[field] !== undefined) {
        const value = obj[field];
        // Handle BigInt string or number
        const timestamp = typeof value === 'string' ? parseInt(value) : Number(value);
        if (!isNaN(timestamp) && timestamp > 0) {
          return timestamp;
        }
      }
    }
    
    // Recursively search in nested objects (including arrays)
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const found = findTimestampInResult(obj[key]);
        if (found) return found;
      }
    }
    
    return null;
  };

  const handleFindHeightFromDecode = (decodedResult) => {
    // Find timestamp in decoded result
    const timestamp = findTimestampInResult(decodedResult);
    
    if (!timestamp) {
      showToast('No timestamp/deadline found in decoded result', 'error');
      return;
    }
    
    // Subtract 1 hour (3600 seconds) from timestamp
    const adjustedTimestamp = timestamp - 3600;
    
    // Set the initial timestamp and navigate to utilities tab
    setUtilitiesInitialTimestamp(adjustedTimestamp.toString());
    setActiveTab('utilities');
    showToast(`timestamp: ${adjustedTimestamp} (original: ${timestamp} - 1hr)`, 'success');
  };

  return (
    <div className="App">
      <header className="App-header">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'decode' ? 'active' : ''}`}
            onClick={() => setActiveTab('decode')}
          >
            Decode Calldata
          </button>
          <button 
            className={`tab-button ${activeTab === 'encode' ? 'active' : ''}`}
            onClick={() => setActiveTab('encode')}
          >
            Encode Calldata
          </button>
          <button 
            className={`tab-button ${activeTab === 'simulate' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulate')}
          >
            Simulate TX
          </button>
          <button 
            className={`tab-button ${activeTab === 'utilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('utilities')}
          >
            Utilities
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'decode' && (
            <DecodeCalldata
              value={leftInput}
              onChange={(e) => setLeftInput(e.target.value)}
              validationResult={decodeValidation}
              onButtonClick={createDecodeOperation(
                leftInput,
                resolve,
                validateDecodedJson,
                showToast,
                setDecodeResult,
                setDecodeValidation
              )}
              result={decodeResult}
              showToast={showToast}
              onEdit={handleEditFromDecode}
              onFindHeight={handleFindHeightFromDecode}
            />
          )}

          {activeTab === 'encode' && (
            <EncodeCalldata
              value={rightInput}
              onChange={(e) => setRightInput(e.target.value)}
              validationResult={encodeValidation}
              onButtonClick={createEncodeOperation(
                rightInput,
                encode,
                validateEncodedCalldata,
                showToast,
                setEncodeResult,
                setEncodeValidation
              )}
              result={encodeResult}
              showToast={showToast}
            />
          )}

          {activeTab === 'simulate' && (
            <SimulateTX
              simulationState={simulationState}
              updateSimulationFormData={updateSimulationFormData}
              updateSimulationStatus={updateSimulationStatus}
              showToast={showToast}
            />
          )}

          {activeTab === 'utilities' && (
            <Utilities 
              showToast={showToast} 
              initialTimestamp={utilitiesInitialTimestamp}
              onInitialTimestampConsumed={() => setUtilitiesInitialTimestamp(null)}
            />
          )}

        </div>
        
        {/* Toast notification */}
        {toast && (
          <div className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
