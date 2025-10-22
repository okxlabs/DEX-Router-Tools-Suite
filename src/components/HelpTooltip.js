import React, { useState } from 'react';
import './HelpTooltip.css';

const HelpTooltip = ({ type }) => {
  const [isVisible, setIsVisible] = useState(false);

  const getTutorialContent = () => {
    if (type === 'encode') {
      return {
        title: "How to Use Encode Calldata",
        steps: [
          {
            step: 1,
            title: "Configure Commission (Optional)",
            description: "Set referrer addresses and rates. Choose FromToken or ToToken commission types. Configure token address and ToB settings."
          },
          {
            step: 2,
            title: "Configure Trim (Optional)",
            description: "Add trim/charge addresses and rates for fee collection. Set expected amount out for validation."
          },
          {
            step: 3,
            title: "Choose an Example",
            description: "Select from the examples panel on the left to load pre-configured JSON data for different DEX functions."
          },
          {
            step: 4,
            title: "Edit JSON Data",
            description: "Modify the JSON in the textarea on the right. The structure includes function details, commission, and trim configurations."
          },
          {
            step: 5,
            title: "Encode to Calldata",
            description: "Click 'Encode' to convert your JSON configuration into blockchain calldata. Copy the result using the clipboard icon."
          }
        ],
        tips: [
          "Examples automatically include commission and trim based on your panel settings",
          "Validation ensures your encoded calldata can be properly decoded",
          "Use the clipboard icon to copy results for blockchain transactions"
        ]
      };
    }
    return null;
  };

  const tutorial = getTutorialContent();

  if (!tutorial) return null;

  return (
    <div className="help-tooltip-container">
      <div
        className="help-icon"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        ?
      </div>

      {isVisible && (
        <div className="help-tooltip">
          <div className="help-tooltip-content">
            <h3 className="help-title">{tutorial.title}</h3>

            <div className="help-steps">
              {tutorial.steps.map((step) => (
                <div key={step.step} className="help-step">
                  <div className="step-number">{step.step}</div>
                  <div className="step-content">
                    <h4 className="step-title">{step.title}</h4>
                    <p className="step-description">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="help-tips">
              <h4 className="tips-title">💡 Tips:</h4>
              <ul className="tips-list">
                {tutorial.tips.map((tip, index) => (
                  <li key={index} className="tip-item">{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpTooltip;
