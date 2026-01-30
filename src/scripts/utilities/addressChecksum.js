import { ethers } from 'ethers';

/**
 * Convert an Ethereum address to its checksummed format (EIP-55)
 * @param {string} address - The address to checksum
 * @returns {string} The checksummed address
 */
export function toChecksumAddress(address) {
  if (!address || typeof address !== 'string') {
    throw new Error('Invalid address: must be a string');
  }

  // Remove 0x prefix and lowercase
  const addr = address.toLowerCase().replace('0x', '');
  
  // Validate address format
  if (!/^[0-9a-f]{40}$/i.test(addr)) {
    throw new Error('Invalid address: must be 40 hex characters');
  }

  // Use ethers to get checksum address
  return ethers.utils.getAddress('0x' + addr);
}

/**
 * Validate if an address has valid checksum
 * @param {string} address - The address to validate
 * @returns {boolean} True if checksum is valid
 */
export function isValidChecksum(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    const checksummed = toChecksumAddress(address);
    return address === checksummed;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid Ethereum address (with or without valid checksum)
 * @param {string} address - The address to check
 * @returns {boolean} True if valid address format
 */
export function isValidAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }

  const addr = address.replace('0x', '');
  return /^[0-9a-fA-F]{40}$/.test(addr);
}
