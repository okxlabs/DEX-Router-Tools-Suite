import './App.css';
import { useState } from 'react';
import { resolve } from './utils/decode/decode_index.js';
import { encode } from './utils/encode/encode_index.js';
import { validateEncodedCalldata, validateDecodedJson } from './utils/core/roundtrip_validator.js';
import { createDecodeOperation, createEncodeOperation, formatJSON } from './utils/componentUtils.js';
import DecodeCalldata from './components/forms/DecodeCalldata';
import EncodeCalldata from './components/forms/EncodeCalldata';
import SimulateTX from './components/SimulateTX';

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

  const handleSimulateFromEncode = (calldata) => {
    // Navigate to simulate tab and populate with encoded calldata
    setActiveTab('simulate');
    updateSimulationFormData('calldata', calldata);
    showToast('Switched to Simulate TX tab with encoded calldata!', 'success');
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
              onSimulate={handleSimulateFromEncode}
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
