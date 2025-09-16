import './App.css';
import { useState } from 'react';
import { resolve } from './utils/decode_calldata.js';
import ToolSection from './components/ToolSection.js';

function App() {
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
        <div className="app-container">
          <ToolSection
            title="Decode calldata"
            placeholder="Enter calldata to decode... (with or without 0x prefix)"
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
            buttonText="Decode"
            result={decodeResult}
            showToast={showToast}
          />

          <ToolSection
            title="TX simulation"
            placeholder="Enter transaction data for simulation..."
            value={rightInput}
            onChange={(e) => setRightInput(e.target.value)}
            onButtonClick={() => {
              if (rightInput.trim()) {
                showToast('This function is not implemented', 'error');
                setSimulationResult(null);
              } else {
                showToast('Please enter transaction data to simulate', 'error');
              }
            }}
            buttonText="Simulate"
            result={simulationResult}
            showToast={showToast}
          />
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
