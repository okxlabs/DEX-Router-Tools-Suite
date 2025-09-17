import './App.css';
import { useState } from 'react';
import { resolve } from './utils/decode_calldata.js';
import DecodeCalldata from './components/DecodeCalldata.js';
import TxSimulation from './components/TxSimulation.js';

function App() {
  const [activeTab, setActiveTab] = useState('decode');
  const [leftInput, setLeftInput] = useState('');
  const [rightInput, setRightInput] = useState('');
  const [decodeResult, setDecodeResult] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
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
            className={`tab-button ${activeTab === 'simulation' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulation')}
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

          {activeTab === 'simulation' && (
            <TxSimulation
              onButtonClick={(formData) => {
                if (formData.transactionData.trim() || formData.fromAddress.trim() || formData.toAddress.trim()) {
                  showToast('This function is not implemented', 'error');
                  setSimulationResult(null);
                } else {
                  showToast('Please enter transaction data to simulate', 'error');
                }
              }}
              result={simulationResult}
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
