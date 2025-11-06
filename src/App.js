import './App.css';
import { useState } from 'react';
import { resolve } from './utils/decode/decode_index.js';
import { encode } from './utils/encode/encode_index.js';
import { validateEncodedCalldata, validateDecodedJson } from './utils/core/roundtrip_validator.js';
import DecodeCalldata from './components/DecodeCalldata.js';
import EncodeCalldata from './components/EncodeCalldata.js';
import SimulateTX from './components/SimulateTX.js';

function App() {
  const [activeTab, setActiveTab] = useState('decode');
  const [leftInput, setLeftInput] = useState('');
  const [rightInput, setRightInput] = useState('');
  const [decodeResult, setDecodeResult] = useState(null);
  const [encodeResult, setEncodeResult] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
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
              onButtonClick={() => {
                if (!leftInput.trim()) {
                  showToast('Please enter calldata to decode', 'error');
                  return;
                }
                
                try {
                  const originalCalldata = leftInput.trim();
                  const result = resolve(originalCalldata);
                  
                  // Validate the decoded JSON by encoding it back
                  const validation = validateDecodedJson(originalCalldata, result);
                  
                  setDecodeResult(result);
                  
                  if (validation.success) {
                    showToast('✅ Decoding successful and validated!', 'success');
                  } else {
                    showToast(`${validation.summary}`, 'error', 30000); // Red toast for 30 seconds
                    console.warn('Reverse validation details:', validation);
                  }
                } catch (error) {
                  showToast('Error: Failed to decode calldata', 'error');
                  setDecodeResult({ success: false, error: error.message });
                }
              }}
              result={decodeResult}
              showToast={showToast}
            />
          )}

          {activeTab === 'encode' && (
            <EncodeCalldata
              value={rightInput}
              onChange={(e) => setRightInput(e.target.value)}
              onButtonClick={() => {
                if (!rightInput.trim()) {
                  showToast('Please enter json data to encode', 'error');
                  return;
                }
                
                try {
                  // Parse the JSON input
                  const jsonData = JSON.parse(rightInput.trim());
                  
                  // Encode the JSON data to calldata
                  const result = encode(jsonData);
                  
                  // Validate the encoded calldata by decoding it back
                  const validation = validateEncodedCalldata(jsonData, result);
                  
                  setEncodeResult(result);
                  
                  if (validation.success) {
                    showToast('✅ Encoding successful and validated!', 'success');
                  } else {
                    showToast(`${validation.summary}`, 'error', 30000); // Red toast for 30 seconds
                    console.warn('Validation details:', validation);
                  }
                } catch (error) {
                  showToast('Error: Invalid JSON format or encoding failed', 'error');
                  setEncodeResult('Error: ' + error.message);
                }
              }}
              result={encodeResult}
              showToast={showToast}
            />
          )}

          {activeTab === 'simulate' && (
            <SimulateTX
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
