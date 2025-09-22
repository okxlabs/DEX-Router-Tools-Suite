import './App.css';
import { useState } from 'react';
import { resolve } from './utils/decode_calldata.js';
import DecodeCalldata from './components/DecodeCalldata.js';

function App() {
  const [activeTab, setActiveTab] = useState('decode');
  const [leftInput, setLeftInput] = useState('');
  const [decodeResult, setDecodeResult] = useState(null);
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
            className={`tab-button ${activeTab === 'simulation' ? 'active' : ''} disabled`}
            onClick={() => {
              showToast('Sorry, this function is not ready yet. Please check back later!', 'error');
            }}
            title="This feature is coming soon!"
          >
            TX Simulation
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
