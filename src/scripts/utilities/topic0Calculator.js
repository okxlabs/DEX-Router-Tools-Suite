import { ethers } from 'ethers';

/**
 * Calculate topic0 (event signature hash) from event signature
 * @param {string} eventSignature - Event signature like "Transfer(address,address,uint256)"
 * @returns {string} The topic0 hash
 */
export function calculateTopic0(eventSignature) {
  if (!eventSignature || typeof eventSignature !== 'string') {
    throw new Error('Invalid event signature');
  }

  const trimmed = eventSignature.trim();
  
  // Validate basic format: should have parentheses
  if (!trimmed.includes('(') || !trimmed.includes(')')) {
    throw new Error('Invalid format: must include parentheses, e.g., "Transfer(address,address,uint256)"');
  }

  // Calculate keccak256 hash
  const hash = ethers.utils.id(trimmed);
  
  return hash;
}

/**
 * Parse event definition and normalize it for topic0 calculation
 * Handles formats like:
 * - "Transfer(address,address,uint256)"
 * - "Transfer(address indexed from, address indexed to, uint256 value)"
 * - "event Transfer(address indexed from, address indexed to, uint256 value)"
 * - "Transfer(index_topic_1 address from, index_topic_2 address to, uint256 value)" (Etherscan format)
 * @param {string} eventDef - Event definition
 * @returns {string} Normalized event signature
 */
export function normalizeEventSignature(eventDef) {
  if (!eventDef || typeof eventDef !== 'string') {
    throw new Error('Invalid event definition');
  }

  let signature = eventDef.trim();
  
  // Remove "event " prefix if present
  if (signature.toLowerCase().startsWith('event ')) {
    signature = signature.slice(6).trim();
  }
  
  // Ignore everything after the closing parenthesis
  const closingParenIndex = signature.lastIndexOf(')');
  if (closingParenIndex !== -1) {
    signature = signature.substring(0, closingParenIndex + 1);
  }

  // Extract event name and parameters
  const match = signature.match(/^(\w+)\s*\((.*)\)$/);
  if (!match) {
    throw new Error('Invalid event format');
  }

  const eventName = match[1];
  const paramsStr = match[2];

  // If params are empty, return as is
  if (!paramsStr.trim()) {
    return `${eventName}()`;
  }

  // Check if a string is a valid Solidity type
  const isValidSolidityType = (type) => {
    // Remove array suffix for base type check
    const baseType = type.replace(/\[\d*\]$/, '');
    
    // Simple types
    if (['address', 'bool', 'string', 'bytes'].includes(baseType)) {
      return true;
    }
    
    // bytes1 to bytes32
    const bytesMatch = baseType.match(/^bytes(\d+)$/);
    if (bytesMatch) {
      const num = parseInt(bytesMatch[1]);
      return num >= 1 && num <= 32;
    }
    
    // uint and int (with optional size 8-256, must be multiple of 8)
    const intMatch = baseType.match(/^(u?int)(\d*)$/);
    if (intMatch) {
      const size = intMatch[2];
      if (size === '') return true; // uint or int without size is valid (defaults to 256)
      const num = parseInt(size);
      return num >= 8 && num <= 256 && num % 8 === 0;
    }
    
    return false;
  };

  // Parse parameters and extract only types
  const params = paramsStr.split(',').map(param => {
    const parts = param.trim().split(/\s+/);
    
    for (const part of parts) {
      if (isValidSolidityType(part)) {
        return part;
      }
    }
    
    throw new Error(`Could not find valid type in: "${param.trim()}"`);
  });

  return `${eventName}(${params.join(',')})`;
}

/**
 * Calculate topic0 from any event format (auto-normalizes)
 * @param {string} eventDef - Event definition in any format
 * @returns {{ signature: string, topic0: string }} Normalized signature and topic0
 */
export function getEventTopic0(eventDef) {
  const normalizedSignature = normalizeEventSignature(eventDef);
  const topic0 = calculateTopic0(normalizedSignature);
  
  return {
    signature: normalizedSignature,
    topic0: topic0
  };
}
