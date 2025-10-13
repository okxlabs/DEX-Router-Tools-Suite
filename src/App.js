import './App.css';
import { useState } from 'react';
import { resolve } from './utils/decode/decode_index.js';
import { encode } from './utils/encode/encode_index.js';
import DecodeCalldata from './components/DecodeCalldata.js';
import EncodeCalldata from './components/EncodeCalldata.js';

function App() {
  const [activeTab, setActiveTab] = useState('decode');
  const [leftInput, setLeftInput] = useState('');
  const [rightInput, setRightInput] = useState('');
  const [decodeResult, setDecodeResult] = useState(null);
  const [encodeResult, setEncodeResult] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // Hide after 3 seconds
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
                
                const result = resolve(leftInput.trim());
                setDecodeResult(result);
                showToast('Calldata decoded');
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
                  
                  setEncodeResult(result);
                  showToast('JSON data successfully encoded to calldata!');
                } catch (error) {
                  showToast('Error: Invalid JSON format or encoding failed', 'error');
                  setEncodeResult('Error: ' + error.message);
                }
              }}
              result={encodeResult}
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
