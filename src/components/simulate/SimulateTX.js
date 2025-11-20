import React, { useState, useEffect } from 'react';
import SimulateFoundry from './SimulateFoundry';
import SimulateTenderly from './SimulateTenderly';
import { chainOptions, rpcUrlOptions } from '../../utils/networkConfig';

const SimulateTX = ({ 
  simulationState,
  updateSimulationFormData,
  updateSimulationStatus,
  showToast 
}) => {
  const { formData, isSimulating, simulationResult } = simulationState;
  
  // Initialize activeTab from localStorage or default to 'tenderly'
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('simulation_active_tab') || 'tenderly';
  });

  useEffect(() => {
    const savedProjectSlug = localStorage.getItem('tenderly_project_slug');

    if (savedProjectSlug && !formData.projectSlug) {
      updateSimulationFormData('projectSlug', savedProjectSlug);
    }
  }, [formData.projectSlug, updateSimulationFormData]);

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('simulation_active_tab', tab);
  };

  const handleInputChange = (field, value) => {
    updateSimulationFormData(field, value);

    if (field === 'chainId') {
      if (value === 'other') {
        updateSimulationFormData('customChainId', '');
      } else {
        updateSimulationFormData('customChainId', value);
      }
    }

    if (field === 'customChainId') {
      const matchingNetwork = chainOptions.find(option => option.id === value && option.id !== 'other');
      
      if (matchingNetwork) {
        updateSimulationFormData('chainId', matchingNetwork.id);
      } else {
        updateSimulationFormData('chainId', 'other');
      }
    }

    if (field === 'rpcUrlPreset') {
      if (value === 'custom') {
        updateSimulationFormData('rpcUrl', '');
      } else {
        const selectedRpc = rpcUrlOptions.find(option => option.id === value);
        if (selectedRpc) {
          updateSimulationFormData('rpcUrl', selectedRpc.url);
        }
      }
    }

    if (field === 'rpcUrl') {
      const matchingRpc = rpcUrlOptions.find(option => option.url === value && option.id !== 'custom');
      
      if (matchingRpc) {
        updateSimulationFormData('rpcUrlPreset', matchingRpc.id);
      } else {
        updateSimulationFormData('rpcUrlPreset', 'custom');
      }
    }

    if (field === 'projectSlug') {
      localStorage.setItem('tenderly_project_slug', value);
    }
  };

  const commonProps = {
    formData,
    isSimulating,
    simulationResult,
    handleInputChange,
    showToast,
    updateSimulationStatus
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="simulation-tab-navigation">
        <button
          className={`simulation-tab-button ${activeTab === 'foundry' ? 'active' : ''}`}
          onClick={() => handleTabChange('foundry')}
        >
          Foundry
        </button>
        <button
          className={`simulation-tab-button ${activeTab === 'tenderly' ? 'active' : ''}`}
          onClick={() => handleTabChange('tenderly')}
        >
          Tenderly
        </button>
      </div>

      {/* Tab Content */}
      <div className="simulation-tab-content">
        {activeTab === 'foundry' && <SimulateFoundry {...commonProps} />}
        {activeTab === 'tenderly' && <SimulateTenderly {...commonProps} />}
      </div>
    </div>
  );
};

export default SimulateTX;
